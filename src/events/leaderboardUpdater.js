const { getConfig } = require("../utils/serverConfig");
const db = require("../database/database");
const leaderboardDB = require("../database/leaderboardMessages");
const createActivityEmbed = require("../utils/activityEmbed");

console.log("LEADERBOARD UPDATER LOADED");

// =========================
// PERIOD DATABASE
// =========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS leaderboard_periods (
        type TEXT PRIMARY KEY,
        start_at INTEGER NOT NULL,
        end_at INTEGER NOT NULL
    )
`).run();

// =========================
// TIME HELPERS
// =========================

const DAY = 24 * 60 * 60;
const WEEK = 7 * DAY;

function nowTimestamp() {
    return Math.floor(Date.now() / 1000);
}

function getNextMondayTimestamp(fromTimestamp) {

    const date = new Date(fromTimestamp * 1000);

    const next = new Date(date);

    const currentDay = next.getDay();

    let daysUntilMonday =
        (8 - currentDay) % 7;

    if (daysUntilMonday === 0) {
        daysUntilMonday = 7;
    }

    next.setDate(
        next.getDate() + daysUntilMonday
    );

    next.setHours(0, 0, 0, 0);

    return Math.floor(next.getTime() / 1000);
}

// =========================
// CREATE INITIAL PERIODS
// =========================

function initializePeriods() {

    const now = nowTimestamp();

    // 24H
    const daily = db.prepare(
        "SELECT * FROM leaderboard_periods WHERE type = ?"
    ).get("24h");

    if (!daily) {

        db.prepare(`
            INSERT INTO leaderboard_periods
            (type, start_at, end_at)
            VALUES (?, ?, ?)
        `).run(
            "24h",
            now,
            now + DAY
        );

        console.log("24H leaderboard period initialized.");
    }

    // 7D
    const weekly = db.prepare(
        "SELECT * FROM leaderboard_periods WHERE type = ?"
    ).get("7d");

    if (!weekly) {

        const nextMonday =
            getNextMondayTimestamp(now);

        db.prepare(`
            INSERT INTO leaderboard_periods
            (type, start_at, end_at)
            VALUES (?, ?, ?)
        `).run(
            "7d",
            now,
            nextMonday
        );

        console.log("7D leaderboard period initialized.");
    }
}

initializePeriods();

// =========================
// PERIOD MANAGEMENT
// =========================

function getPeriod(type) {

    return db.prepare(
        "SELECT * FROM leaderboard_periods WHERE type = ?"
    ).get(type);
}

function setPeriod(type, startAt, endAt) {

    db.prepare(`
        UPDATE leaderboard_periods
        SET start_at = ?, end_at = ?
        WHERE type = ?
    `).run(
        startAt,
        endAt,
        type
    );
}

// =========================
// LEADERBOARD QUERIES
// =========================

function getChatTop(startAt, endAt) {

    return db.prepare(`
        SELECT
            user_id,
            SUM(amount) AS messages
        FROM activity_logs
        WHERE type = 'chat'
        AND strftime('%s', created_at) >= ?
        AND strftime('%s', created_at) < ?
        GROUP BY user_id
        ORDER BY messages DESC
        LIMIT 5
    `).all(
        startAt,
        endAt
    );
}

function getVoiceTop(startAt, endAt) {

    return db.prepare(`
        SELECT
            user_id,
            SUM(amount) AS voice_time
        FROM activity_logs
        WHERE type = 'voice'
        AND strftime('%s', created_at) >= ?
        AND strftime('%s', created_at) < ?
        GROUP BY user_id
        ORDER BY voice_time DESC
        LIMIT 5
    `).all(
        startAt,
        endAt
    );
}

// =========================
// USER DATA
// =========================

async function addUserData(channel, users) {

    return Promise.all(
        users.map(async (user) => {

            const member = await channel.guild.members
                .fetch(user.user_id)
                .catch(() => null);

            return {
                ...user,

                username: member
                    ? member.user.username
                    : "Unknown",

                avatar: member
                    ? member.user.displayAvatarURL({
                        extension: "png",
                        size: 256
                    })
                    : null
            };
        })
    );
}

// =========================
// SEND / UPDATE MESSAGE
// =========================

async function sendOrUpdate(channel, type, embed) {

    const old = leaderboardDB.prepare(
        "SELECT * FROM leaderboard_messages WHERE type = ?"
    ).get(type);

    if (old) {

        try {

            const message =
                await channel.messages.fetch(
                    old.message_id
                );

            await message.edit({
                embeds: [embed]
            });

            return;

        } catch (error) {

            if (error.code !== 10008) {

                console.error(
                    `Failed to update ${type}:`,
                    error.message
                );

                return;
            }

            leaderboardDB.prepare(
                "DELETE FROM leaderboard_messages WHERE type = ?"
            ).run(type);
        }
    }

    try {

        const message =
            await channel.send({
                embeds: [embed]
            });

        leaderboardDB.prepare(`
            INSERT INTO leaderboard_messages
            (type, message_id)
            VALUES (?, ?)
        `).run(
            type,
            message.id
        );

    } catch (error) {

        console.error(
            `Failed to send ${type}:`,
            error.message
        );
    }
}

// =========================
// WEEKLY WINNER ROLES
// =========================

async function updateWinnerRoles(
    guild,
    chatTop,
    voiceTop
) {

    console.log(
        "Updating weekly winner roles..."
    );

    const config =
        getConfig(guild.id);

    if (
        !config.chat_king_role ||
        !config.voice_king_role
    ) {

        console.log(
            "Activity roles not configured."
        );

        return;
    }

    // =========================
    // REMOVE OLD CHAT RULER
    // =========================

    const oldChatRole =
        guild.roles.cache.get(
            config.chat_king_role
        );

    if (oldChatRole) {

        for (
            const member of oldChatRole.members.values()
        ) {

            if (
                !chatTop ||
                member.id !== chatTop.user_id
            ) {

                await member.roles
                    .remove(config.chat_king_role)
                    .catch(() => {});
            }
        }
    }

    // =========================
    // REMOVE OLD VOICE RULER
    // =========================

    const oldVoiceRole =
        guild.roles.cache.get(
            config.voice_king_role
        );

    if (oldVoiceRole) {

        for (
            const member of oldVoiceRole.members.values()
        ) {

            if (
                !voiceTop ||
                member.id !== voiceTop.user_id
            ) {

                await member.roles
                    .remove(config.voice_king_role)
                    .catch(() => {});
            }
        }
    }

    // =========================
    // GIVE CHAT RULER
    // =========================

    if (chatTop) {

        const member =
            await guild.members
                .fetch(chatTop.user_id)
                .catch(() => null);

        if (member) {

            await member.roles
                .add(config.chat_king_role)
                .catch(() => {});
        }
    }

    // =========================
    // GIVE VOICE RULER
    // =========================

    if (voiceTop) {

        const member =
            await guild.members
                .fetch(voiceTop.user_id)
                .catch(() => null);

        if (member) {

            await member.roles
                .add(config.voice_king_role)
                .catch(() => {});
        }
    }

    console.log(
        "Weekly winner roles updated."
    );
}

// =========================
// CHECK / RESET PERIODS
// =========================

async function checkPeriods(guild) {

    const now = nowTimestamp();

    // =========================
    // 24H RESET
    // =========================

    let daily =
        getPeriod("24h");

    if (now >= daily.end_at) {

        const missedPeriods =
            Math.floor(
                (now - daily.start_at) / DAY
            );

        const newStart =
            daily.start_at +
            ((missedPeriods + 1) * DAY);

        const newEnd =
            newStart + DAY;

        setPeriod(
            "24h",
            newStart,
            newEnd
        );

        console.log(
            "24H leaderboard RESET."
        );
    }

    // =========================
    // 7D RESET
    // =========================

    let weekly =
        getPeriod("7d");

    if (now >= weekly.end_at) {

        // Previous completed week
        const previousStart =
            weekly.start_at;

        const previousEnd =
            weekly.end_at;

        // Find previous week's winners
        const chatWinner =
            getChatTop(
                previousStart,
                previousEnd
            )[0];

        const voiceWinner =
            getVoiceTop(
                previousStart,
                previousEnd
            )[0];

        // Give roles to previous week's winners
        await updateWinnerRoles(
            guild,
            chatWinner,
            voiceWinner
        );

        // Start new weekly period
        const newStart =
            previousEnd;

        let newEnd =
            getNextMondayTimestamp(
                newStart
            );

        // Safety in case timestamp is already Monday midnight
        if (newEnd <= newStart) {
            newEnd =
                newStart + WEEK;
        }

        setPeriod(
            "7d",
            newStart,
            newEnd
        );

        console.log(
            "7D leaderboard RESET."
        );
    }
}

// =========================
// MODULE
// =========================

module.exports = async (client) => {

    const guild =
        client.guilds.cache.first();

    if (!guild) return;

    const config =
        getConfig(guild.id);

    if (!config.leaderboard_channel) {

        console.log(
            "No leaderboard channel configured."
        );

        return;
    }

    const channel =
        await client.channels
            .fetch(config.leaderboard_channel)
            .catch(() => null);

    if (!channel) {

        console.log(
            "Leaderboard channel could not be fetched."
        );

        return;
    }

    let updating = false;

    // =========================
    // UPDATE LEADERBOARDS
    // =========================

    async function updateLeaderboard() {

        if (updating) return;

        updating = true;

        try {

            // Check whether either period
            // needs to reset first.
            await checkPeriods(
                channel.guild
            );

            const daily =
                getPeriod("24h");

            const weekly =
                getPeriod("7d");

            // =========================
            // CURRENT 24H STATS
            // =========================

            const chat24hRaw =
                getChatTop(
                    daily.start_at,
                    daily.end_at
                );

            const voice24hRaw =
                getVoiceTop(
                    daily.start_at,
                    daily.end_at
                );

            // =========================
            // CURRENT 7D STATS
            // =========================

            const chat7dRaw =
                getChatTop(
                    weekly.start_at,
                    weekly.end_at
                );

            const voice7dRaw =
                getVoiceTop(
                    weekly.start_at,
                    weekly.end_at
                );

            // =========================
            // USER DATA
            // =========================

            const chat24h =
                await addUserData(
                    channel,
                    chat24hRaw
                );

            const voice24h =
                await addUserData(
                    channel,
                    voice24hRaw
                );

            const chat7d =
                await addUserData(
                    channel,
                    chat7dRaw
                );

            const voice7d =
                await addUserData(
                    channel,
                    voice7dRaw
                );

            // =========================
            // 24H EMBED
            // =========================

            const activity24hEmbed =
                createActivityEmbed(
                    chat24h,
                    voice24h,
                    "24h",
                    daily.end_at
                );

            // =========================
            // 7D EMBED
            // =========================

            const activity7dEmbed =
                createActivityEmbed(
                    chat7d,
                    voice7d,
                    "7d",
                    weekly.end_at
                );

            // =========================
            // UPDATE MESSAGES
            // =========================

            await sendOrUpdate(
                channel,
                "activity24h",
                activity24hEmbed
            );

            await sendOrUpdate(
                channel,
                "activity7d",
                activity7dEmbed
            );

        } catch (error) {

            console.error(
                "Leaderboard update failed:",
                error
            );

        } finally {

            updating = false;
        }
    }

    // =========================
    // START
    // =========================

    await updateLeaderboard();

    // =========================
    // UPDATE EVERY 5 MINUTES
    // =========================

    setInterval(
        updateLeaderboard,
        5 * 60 * 1000
    );

    console.log(
        "Activity leaderboards running."
    );
};