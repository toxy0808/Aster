const { MessageFlags } = require("discord.js");
const { getConfig } = require("../utils/serverConfig");
const db = require("../database/database");
const activityDB = require("../database/activityLogs");
const leaderboardDB = require("../database/leaderboardMessages");
const createActivityEmbed = require("../utils/activityEmbed");

console.log("LEADERBOARD UPDATER LOADED");

// ============================================================
// CONFIG
// ============================================================

const TIME_ZONE = "Europe/Stockholm";

const LEADERBOARD_UPDATE_INTERVAL = 5 * 60 * 1000;
const PERIOD_CHECK_INTERVAL = 60 * 1000;

// ============================================================
// STOCKHOLM TIME
// ============================================================

function getStockholmParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date);

    const result = {};

    for (const part of parts) {
        if (part.type !== "literal") {
            result[part.type] = Number(part.value);
        }
    }

    return result;
}

// ============================================================
// DATE HELPERS
// ============================================================

function pad(value) {
    return String(value).padStart(2, "0");
}

function formatStockholmDate(parts) {
    return [
        parts.year,
        pad(parts.month),
        pad(parts.day)
    ].join("-");
}

function formatStockholmDateTime(parts) {
    return `${formatStockholmDate(parts)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
}

// ============================================================
// PERIOD STARTS
// ============================================================

function getStartOfTodayString() {
    const now = getStockholmParts();

    return `${now.year}-${pad(now.month)}-${pad(now.day)} 00:00:00`;
}

function getStartOfWeekString() {
    const now = getStockholmParts();

    const currentDate = new Date(
        Date.UTC(
            now.year,
            now.month - 1,
            now.day
        )
    );

    const day = currentDate.getUTCDay();

    const daysSinceMonday =
        day === 0
            ? 6
            : day - 1;

    currentDate.setUTCDate(
        currentDate.getUTCDate() - daysSinceMonday
    );

    return `${currentDate.getUTCFullYear()}-${pad(
        currentDate.getUTCMonth() + 1
    )}-${pad(
        currentDate.getUTCDate()
    )} 00:00:00`;
}

// ============================================================
// STOCKHOLM → UNIX
// ============================================================

function stockholmToUnix({
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0
}) {
    let timestamp = Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        second
    );

    for (let i = 0; i < 3; i++) {
        const stockholm =
            getStockholmParts(new Date(timestamp));

        const displayedAsUTC =
            Date.UTC(
                stockholm.year,
                stockholm.month - 1,
                stockholm.day,
                stockholm.hour,
                stockholm.minute,
                stockholm.second
            );

        const offset =
            displayedAsUTC - timestamp;

        const corrected =
            Date.UTC(
                year,
                month - 1,
                day,
                hour,
                minute,
                second
            ) - offset;

        if (corrected === timestamp) {
            break;
        }

        timestamp = corrected;
    }

    return Math.floor(timestamp / 1000);
}

// ============================================================
// NEXT RESET TIMESTAMPS
// ============================================================

function getNextMidnightTimestamp() {
    const now = getStockholmParts();

    const tomorrow = new Date(
        Date.UTC(
            now.year,
            now.month - 1,
            now.day + 1
        )
    );

    return stockholmToUnix({
        year: tomorrow.getUTCFullYear(),
        month: tomorrow.getUTCMonth() + 1,
        day: tomorrow.getUTCDate(),
        hour: 0,
        minute: 0,
        second: 0
    });
}

function getNextMondayTimestamp() {
    const now = getStockholmParts();

    const currentDate = new Date(
        Date.UTC(
            now.year,
            now.month - 1,
            now.day
        )
    );

    const day = currentDate.getUTCDay();

    const daysUntilMonday =
        day === 0
            ? 1
            : 8 - day;

    currentDate.setUTCDate(
        currentDate.getUTCDate() + daysUntilMonday
    );

    return stockholmToUnix({
        year: currentDate.getUTCFullYear(),
        month: currentDate.getUTCMonth() + 1,
        day: currentDate.getUTCDate(),
        hour: 0,
        minute: 0,
        second: 0
    });
}

// ============================================================
// CURRENT PERIOD IDENTIFIERS
// ============================================================

function getCurrent24hPeriod() {
    return getStartOfTodayString();
}

function getCurrent7dPeriod() {
    return getStartOfWeekString();
}

// ============================================================
// LEADERBOARD QUERIES
// ============================================================

function getChatTop24h() {
    const since = getCurrent24hPeriod();

    return activityDB.prepare(`
        SELECT
            user_id,
            SUM(amount) AS messages
        FROM activity_logs
        WHERE type = 'chat'
        AND created_at >= ?
        GROUP BY user_id
        ORDER BY messages DESC
        LIMIT 5
    `).all(since);
}

function getLiveVoiceMinutes() {
    const live = new Map();
    const now = Date.now();

    const sessions = global.activeVoiceUsers;

    if (!sessions) {
        return live;
    }

    for (const [userId, session] of sessions.entries()) {
        let minutes = session.activeMinutes || 0;

        if (!session.muted && session.lastUnmutedAt) {
            minutes += Math.floor(
                (now - session.lastUnmutedAt) / 60000
            );
        }

        if (minutes > 0) {
            live.set(userId, minutes);
        }
    }

    return live;
}

function getVoiceTop24h() {
    const since = getCurrent24hPeriod();

    const rows = activityDB.prepare(`
        SELECT
            user_id,
            SUM(amount) AS voice_time
        FROM activity_logs
        WHERE type = 'voice'
        AND created_at >= ?
        GROUP BY user_id
    `).all(since);

    const totals = new Map();

    for (const row of rows) {
        totals.set(
            row.user_id,
            Number(row.voice_time) || 0
        );
    }

    for (const [userId, minutes] of getLiveVoiceMinutes()) {
        totals.set(
            userId,
            (totals.get(userId) || 0) + minutes
        );
    }

    return [...totals.entries()]
        .map(([user_id, voice_time]) => ({
            user_id,
            voice_time
        }))
        .sort((a, b) => b.voice_time - a.voice_time)
        .slice(0, 5);
}

// ============================================================
// 7D CHAT
// ============================================================

function getChatTop7d() {
    const since = getCurrent7dPeriod();

    return activityDB.prepare(`
        SELECT
            user_id,
            SUM(amount) AS messages
        FROM activity_logs
        WHERE type = 'chat'
        AND created_at >= ?
        GROUP BY user_id
        ORDER BY messages DESC
        LIMIT 5
    `).all(since);
}

// ============================================================
// 7D VOICE
// ============================================================

function getVoiceTop7d() {
    const since = getCurrent7dPeriod();

    const rows = activityDB.prepare(`
        SELECT
            user_id,
            SUM(amount) AS voice_time
        FROM activity_logs
        WHERE type = 'voice'
        AND created_at >= ?
        GROUP BY user_id
    `).all(since);

    const totals = new Map();

    for (const row of rows) {
        totals.set(
            row.user_id,
            Number(row.voice_time) || 0
        );
    }

    for (const [userId, minutes] of getLiveVoiceMinutes()) {
        totals.set(
            userId,
            (totals.get(userId) || 0) + minutes
        );
    }

    return [...totals.entries()]
        .map(([user_id, voice_time]) => ({
            user_id,
            voice_time
        }))
        .sort((a, b) => b.voice_time - a.voice_time)
        .slice(0, 5);
}

// ============================================================
// USER DATA
// ============================================================

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

// ============================================================
// SEND / UPDATE LEADERBOARD MESSAGE
// ============================================================

async function sendOrUpdate(channel, type, embed) {
    const old =
        leaderboardDB
            .prepare(
                "SELECT * FROM leaderboard_messages WHERE type = ?"
            )
            .get(type);

    if (old) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const message =
                    await channel.messages.fetch(
                        old.message_id
                    );

                console.log(`✏️ Updating ${type}`);

                await message.edit({
                    components: [embed],
                    flags: MessageFlags.IsComponentsV2
                });

                return true;

            } catch (error) {
                if (error.code === 10008) {
                    leaderboardDB
                        .prepare(
                            "DELETE FROM leaderboard_messages WHERE type = ?"
                        )
                        .run(type);

                    break;
                }

                console.error(
                    `Failed to update ${type} ` +
                    `(attempt ${attempt}/3):`,
                    error.message
                );

                if (attempt < 3) {
                    await new Promise(resolve =>
                        setTimeout(
                            resolve,
                            2000 * attempt
                        )
                    );
                }
            }
        }
    }

    try {
        const message =
            await channel.send({
                components: [embed],
                flags: MessageFlags.IsComponentsV2
            });

        leaderboardDB
            .prepare(`
                INSERT INTO leaderboard_messages
                (type, message_id)
                VALUES (?, ?)
            `)
            .run(
                type,
                message.id
            );

        return true;

    } catch (error) {
        console.error(
            `Failed to send ${type}:`,
            error.message
        );

        return false;
    }
}

// ============================================================
// MODULE
// ============================================================

module.exports = async (client) => {

    const guild =
        client.guilds.cache.get(
            "1434292419788017766"
        );

    if (!guild) {
        return;
    }

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

    // ========================================================
    // PERIOD STATE
    // ========================================================

    let current24hPeriod =
        getCurrent24hPeriod();

    let current7dPeriod =
        getCurrent7dPeriod();

    let updating = false;

    let lastWinnerWeek =
        current7dPeriod;

    console.log(
        `24h leaderboard period: ${current24hPeriod}`
    );

    console.log(
        `7d leaderboard period: ${current7dPeriod}`
    );

    // ========================================================
    // UPDATE LEADERBOARDS
    // ========================================================

    async function updateLeaderboard() {

        if (updating) {
            return;
        }

        updating = true;

        console.log(
            `📊 Leaderboard update started — ${new Date().toISOString()}`
        );

        try {
            const new24hPeriod =
                getCurrent24hPeriod();

            const new7dPeriod =
                getCurrent7dPeriod();

            const reset24h =
                new24hPeriod !== current24hPeriod;

            const reset7d =
                new7dPeriod !== current7dPeriod;

            if (reset24h) {
                console.log(
                    "🔄 24h leaderboard period reset."
                );

                console.log(
                    `Old period: ${current24hPeriod}`
                );

                console.log(
                    `New period: ${new24hPeriod}`
                );

                current24hPeriod =
                    new24hPeriod;
            }

            if (reset7d) {
                console.log(
                    "🔄 7d leaderboard period reset."
                );

                console.log(
                    `Old period: ${current7dPeriod}`
                );

                console.log(
                    `New period: ${new7dPeriod}`
                );

                current7dPeriod =
                    new7dPeriod;
            }

            // =================================================
            // GET CURRENT PERIOD DATA
            // =================================================

            const chat24hRaw =
                getChatTop24h();

            const voice24hRaw =
                getVoiceTop24h();

            const chat7dRaw =
                getChatTop7d();

            const voice7dRaw =
                getVoiceTop7d();

            // =================================================
            // USER DATA
            // =================================================

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

            // =================================================
            // EMBEDS
            // =================================================

            const reset24hTimestamp =
                getNextMidnightTimestamp();

            const activity24hEmbed =
                createActivityEmbed(
                    chat24h,
                    voice24h,
                    "24h",
                    reset24hTimestamp
                );

            const reset7dTimestamp =
                getNextMondayTimestamp();

            const activity7dEmbed =
                createActivityEmbed(
                    chat7d,
                    voice7d,
                    "7d",
                    reset7dTimestamp
                );

            // =================================================
            // UPDATE MESSAGES
            // =================================================

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

            if (reset24h) {
                console.log(
                    "✅ 24h leaderboard reset and rebuilt from 0."
                );
            }

            if (reset7d) {
                console.log(
                    "✅ 7d leaderboard reset and rebuilt from 0."
                );
            }

        } catch (error) {
            console.error(
                "Leaderboard update failed:",
                error
            );

        } finally {
            updating = false;
        }
    }

    // ========================================================
    // WEEKLY WINNER ROLES
    // ========================================================

    async function updateWinnerRoles() {

        console.log(
            "Updating weekly winner roles..."
        );

        const currentWeek =
            getCurrent7dPeriod();

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

        const chatTop =
            getChatTop7d()[0];

        const voiceTop =
            getVoiceTop7d()[0];

        const guild =
            channel.guild;

        const oldChatRole =
            guild.roles.cache.get(
                config.chat_king_role
            );

        if (oldChatRole) {
            for (
                const member
                of oldChatRole.members.values()
            ) {
                if (
                    !chatTop ||
                    member.id !== chatTop.user_id
                ) {
                    await member.roles
                        .remove(
                            config.chat_king_role
                        )
                        .catch(() => {});
                }
            }
        }

        const oldVoiceRole =
            guild.roles.cache.get(
                config.voice_king_role
            );

        if (oldVoiceRole) {
            for (
                const member
                of oldVoiceRole.members.values()
            ) {
                if (
                    !voiceTop ||
                    member.id !== voiceTop.user_id
                ) {
                    await member.roles
                        .remove(
                            config.voice_king_role
                        )
                        .catch(() => {});
                }
            }
        }

        if (chatTop) {
            const member =
                await guild.members
                    .fetch(chatTop.user_id)
                    .catch(() => null);

            if (member) {
                await member.roles
                    .add(
                        config.chat_king_role
                    )
                    .catch(() => {});
            }
        }

        if (voiceTop) {
            const member =
                await guild.members
                    .fetch(voiceTop.user_id)
                    .catch(() => null);

            if (member) {
                await member.roles
                    .add(
                        config.voice_king_role
                    )
                    .catch(() => {});
            }
        }

        lastWinnerWeek =
            currentWeek;

        console.log(
            "Weekly winner roles updated."
        );
    }

    // ========================================================
    // INITIAL UPDATE
    // ========================================================

    await updateLeaderboard();

    await updateWinnerRoles();

    // ========================================================
    // LIVE LEADERBOARD UPDATE
    // ========================================================

    setInterval(
        async () => {
            await updateLeaderboard();
        },
        LEADERBOARD_UPDATE_INTERVAL
    );

    // ========================================================
    // PERIOD RESET CHECK
    // ========================================================

    setInterval(
        async () => {

            const new24hPeriod =
                getCurrent24hPeriod();

            const new7dPeriod =
                getCurrent7dPeriod();

            if (
                new24hPeriod !==
                current24hPeriod
            ) {
                console.log(
                    "⏰ 24h reset detected."
                );

                await updateLeaderboard();
            }

            if (
                new7dPeriod !==
                current7dPeriod
            ) {
                console.log(
                    "⏰ 7d reset detected."
                );

                await updateLeaderboard();

                await updateWinnerRoles();

                console.log(
                    "✅ Weekly leaderboard and winner roles refreshed."
                );
            }

        },
        PERIOD_CHECK_INTERVAL
    );
};