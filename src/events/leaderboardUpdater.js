const { getConfig } = require("../utils/serverConfig");
const db = require("../database/database");
const leaderboardDB = require("../database/leaderboardMessages");
const createActivityEmbed = require("../utils/activityEmbed");

console.log("LEADERBOARD UPDATER LOADED");

// =========================
// TIME HELPERS
// =========================

function getNow() {
    return new Date();
}

// Next 24-hour reset
function getNext24hTimestamp() {
    return Math.floor(
        (Date.now() + 24 * 60 * 60 * 1000) / 1000
    );
}

// Start of the current week: Monday 00:00
function getStartOfWeek() {
    const now = new Date();

    const day = now.getDay();

    // Sunday = 0
    // Monday = 1
    const daysSinceMonday = (day + 6) % 7;

    now.setDate(
        now.getDate() - daysSinceMonday
    );

    now.setHours(0, 0, 0, 0);

    return Math.floor(
        now.getTime() / 1000
    );
}

// Next Monday 00:00
function getNextMondayTimestamp() {
    const now = new Date();
    const next = new Date(now);

    const day = now.getDay();

    let daysUntilMonday =
        (8 - day) % 7;

    if (daysUntilMonday === 0) {
        daysUntilMonday = 7;
    }

    next.setDate(
        now.getDate() + daysUntilMonday
    );

    next.setHours(0, 0, 0, 0);

    return Math.floor(
        next.getTime() / 1000
    );
}

// =========================
// LEADERBOARD QUERIES
// =========================

// =========================
// 24H
// =========================
// Rolling last 24 hours.
// This matches the 24h reset timestamp.

function getChatTop24h() {

    const since =
        Math.floor(Date.now() / 1000) -
        (24 * 60 * 60);

    return db.prepare(`
        SELECT
            user_id,
            SUM(amount) AS messages
        FROM activity_logs
        WHERE type = 'chat'
        AND strftime('%s', created_at) >= ?
        GROUP BY user_id
        ORDER BY messages DESC
        LIMIT 5
    `).all(since);
}

function getVoiceTop24h() {

    const since =
        Math.floor(Date.now() / 1000) -
        (24 * 60 * 60);

    return db.prepare(`
        SELECT
            user_id,
            SUM(amount) AS voice_time
        FROM activity_logs
        WHERE type = 'voice'
        AND strftime('%s', created_at) >= ?
        GROUP BY user_id
        ORDER BY voice_time DESC
        LIMIT 5
    `).all(since);
}

// =========================
// 7D
// =========================
// Current Monday -> next Monday.
// This is an actual weekly leaderboard,
// not a rolling 7-day leaderboard.

function getChatTop7d() {

    const since = getStartOfWeek();

    return db.prepare(`
        SELECT
            user_id,
            SUM(amount) AS messages
        FROM activity_logs
        WHERE type = 'chat'
        AND strftime('%s', created_at) >= ?
        GROUP BY user_id
        ORDER BY messages DESC
        LIMIT 5
    `).all(since);
}

function getVoiceTop7d() {

    const since = getStartOfWeek();

    return db.prepare(`
        SELECT
            user_id,
            SUM(amount) AS voice_time
        FROM activity_logs
        WHERE type = 'voice'
        AND strftime('%s', created_at) >= ?
        GROUP BY user_id
        ORDER BY voice_time DESC
        LIMIT 5
    `).all(since);
}

// =========================
// USER DATA
// =========================

async function addUserData(channel, users) {

    return Promise.all(
        users.map(async (user) => {

            const member =
                await channel.guild.members
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
// SEND / UPDATE
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

            const chat24hRaw =
                getChatTop24h();

            const voice24hRaw =
                getVoiceTop24h();

            const chat7dRaw =
                getChatTop7d();

            const voice7dRaw =
                getVoiceTop7d();

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
            // 24H
            // =========================

            const reset24hTimestamp =
                getNext24hTimestamp();

            const activity24hEmbed =
                createActivityEmbed(
                    chat24h,
                    voice24h,
                    "24h",
                    reset24hTimestamp
                );

            // =========================
            // 7D
            // =========================

            const reset7dTimestamp =
                getNextMondayTimestamp();

            const activity7dEmbed =
                createActivityEmbed(
                    chat7d,
                    voice7d,
                    "7d",
                    reset7dTimestamp
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
    // WEEKLY WINNER ROLES
    // =========================

    async function updateWinnerRoles() {

        console.log(
            "Updating weekly winner roles..."
        );

        const config =
            getConfig(channel.guild.id);

        if (
            !config.chat_king_role ||
            !config.voice_king_role
        ) {

            console.log(
                "Activity roles not configured."
            );

            return;
        }

        const guild =
            channel.guild;

        const chatTop =
            getChatTop7d()[0];

        const voiceTop =
            getVoiceTop7d()[0];

        // =========================
        // REMOVE OLD CHAT RULER
        // =========================

        const chatRole =
            guild.roles.cache.get(
                config.chat_king_role
            );

        if (chatRole) {

            for (
                const member of chatRole.members.values()
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

        const voiceRole =
            guild.roles.cache.get(
                config.voice_king_role
            );

        if (voiceRole) {

            for (
                const member of voiceRole.members.values()
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
        // ADD CHAT RULER
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
        // ADD VOICE RULER
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
    }

    // =========================
    // INITIAL UPDATE
    // =========================

    await updateLeaderboard();

    await updateWinnerRoles();

    // =========================
    // LIVE UPDATE
    // =========================

    setInterval(
        updateLeaderboard,
        5 * 60 * 1000
    );

    // =========================
    // WEEKLY RESET SCHEDULER
    // =========================

    function scheduleWeeklyReset() {

        const now = Date.now();

        const nextMonday =
            getNextMondayTimestamp() * 1000;

        const delay =
            Math.max(
                nextMonday - now,
                1000
            );

        console.log(
            `Next weekly reset scheduled in ${
                Math.round(delay / 1000 / 60)
            } minutes.`
        );

        setTimeout(async () => {

            console.log(
                "WEEKLY RESET TRIGGERED"
            );

            // Remove old #1 roles.
            await updateWinnerRoles();

            // Refresh leaderboard immediately.
            await updateLeaderboard();

            // Schedule the next Monday.
            scheduleWeeklyReset();

        }, delay);
    }

    scheduleWeeklyReset();
};