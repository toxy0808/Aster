const { getConfig } = require("../utils/serverConfig");
const db = require("../database/database");
const leaderboardDB = require("../database/leaderboardMessages");
const createActivityEmbed = require("../utils/activityEmbed");

console.log("LEADERBOARD UPDATER LOADED");

// ============================================================
// TIMEZONE
// ============================================================

const TIME_ZONE = "Europe/Stockholm";

// Get date/time parts in Stockholm.
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


// Convert a Stockholm local date/time to Unix seconds.
// Handles CET/CEST automatically.
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

    // Correct for Stockholm's current UTC offset.
    for (let i = 0; i < 3; i++) {

        const stockholm = getStockholmParts(
            new Date(timestamp)
        );

        const displayedAsUTC = Date.UTC(
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
// RESET TIMESTAMPS
// ============================================================

function getStartOfToday() {

    const now = getStockholmParts();

    return stockholmToUnix({
        year: now.year,
        month: now.month,
        day: now.day,
        hour: 0,
        minute: 0,
        second: 0
    });
}


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


function getStartOfWeek() {

    const now = getStockholmParts();

    const currentDate = new Date(
        Date.UTC(
            now.year,
            now.month - 1,
            now.day
        )
    );

    // Sunday = 0
    // Monday = 1
    const day = currentDate.getUTCDay();

    const daysSinceMonday =
        day === 0 ? 6 : day - 1;

    currentDate.setUTCDate(
        currentDate.getUTCDate() -
        daysSinceMonday
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
        currentDate.getUTCDate() +
        daysUntilMonday
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
// LEADERBOARD QUERIES
// ============================================================

// IMPORTANT:
//
// activity_logs.created_at is stored as:
// YYYY-MM-DD HH:MM:SS
//
// strftime('%s', created_at) converts it
// into Unix seconds.
//
// The reset boundaries above are generated
// specifically for Europe/Stockholm.
//
// ============================================================


// -------------------------
// 24H CHAT
// -------------------------

function getChatTop24h() {

    const since = getStartOfToday();

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


// -------------------------
// 24H VOICE
// -------------------------

function getVoiceTop24h() {

    const since = getStartOfToday();

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


// -------------------------
// WEEKLY CHAT
// -------------------------

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


// -------------------------
// WEEKLY VOICE
// -------------------------

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

async function sendOrUpdate(
    channel,
    type,
    embed
) {

    const old =
        leaderboardDB.prepare(
            "SELECT * FROM leaderboard_messages WHERE type = ?"
        ).get(type);


    // Existing message
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

            // 10008 = Unknown Message
            //
            // The message was actually deleted.
            // Remove its database entry so ASTER
            // can create a replacement.

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


    // Create replacement message
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


// ============================================================
// MODULE
// ============================================================

module.exports = async (client) => {

    const guild =
        client.guilds.cache.first();

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


    let updating = false;

    let lastWinnerWeek =
        getStartOfWeek();


    // ========================================================
    // UPDATE LEADERBOARDS
    // ========================================================

    async function updateLeaderboard() {

        if (updating) {
            return;
        }

        updating = true;

        try {

            // -------------------------
            // GET CURRENT DATA
            // -------------------------

            const chat24hRaw =
                getChatTop24h();

            const voice24hRaw =
                getVoiceTop24h();

            const chat7dRaw =
                getChatTop7d();

            const voice7dRaw =
                getVoiceTop7d();


            // -------------------------
            // USER DATA
            // -------------------------

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
            // 24H
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


            // =================================================
            // 7D
            // =================================================

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
            getStartOfWeek();


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


        // ====================================================
        // REMOVE OLD CHAT RULER
        // ====================================================

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
                        .remove(
                            config.chat_king_role
                        )
                        .catch(() => {});
                }
            }
        }


        // ====================================================
        // REMOVE OLD VOICE RULER
        // ====================================================

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
                        .remove(
                            config.voice_king_role
                        )
                        .catch(() => {});
                }
            }
        }


        // ====================================================
        // GIVE CHAT RULER
        // ====================================================

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


        // ====================================================
        // GIVE VOICE RULER
        // ====================================================

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


        lastWinnerWeek = currentWeek;


        console.log(
            "Weekly winner roles updated."
        );
    }


    // ========================================================
    // INITIAL UPDATE
    // ========================================================

    await updateLeaderboard();

    // Make sure the current weekly #1 has the role
    // when ASTER starts/restarts.
    await updateWinnerRoles();


    // ========================================================
    // LEADERBOARD UPDATE
    // ========================================================

    setInterval(
        async () => {

            await updateLeaderboard();

        },
        5 * 60 * 1000
    );


    // ========================================================
    // WEEKLY RESET / WINNER CHECK
    // ========================================================

    setInterval(
        async () => {

            const currentWeek =
                getStartOfWeek();


            if (
                currentWeek !== lastWinnerWeek
            ) {

                console.log(
                    "New weekly period detected."
                );


                await updateLeaderboard();

                await updateWinnerRoles();


                console.log(
                    "Weekly leaderboard and winner roles refreshed."
                );
            }

        },
        60 * 1000
    );
};