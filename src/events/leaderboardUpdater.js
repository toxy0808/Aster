const { getConfig } = require("../utils/serverConfig");
const db = require("../database/database");
const leaderboardDB = require("../database/leaderboardMessages");
const createActivityEmbed = require("../utils/activityEmbed");

console.log("LEADERBOARD UPDATER LOADED");

function getStartOfToday() {
    const now = new Date();

    now.setHours(0, 0, 0, 0);

    return Math.floor(now.getTime() / 1000);
}

function getNextMondayTimestamp() {
    const now = new Date();
    const next = new Date();

    next.setDate(
        now.getDate() + ((8 - now.getDay()) % 7)
    );

    next.setHours(0, 0, 0, 0);

    return Math.floor(next.getTime() / 1000);
}

function getChatTop24h() {
    const since = getStartOfToday();

    return db.prepare(`
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

function getVoiceTop24h() {
    const since = getStartOfToday();

    return db.prepare(`
        SELECT
            user_id,
            SUM(amount) AS voice_time
        FROM activity_logs
        WHERE type = 'voice'
        AND created_at >= ?
        GROUP BY user_id
        ORDER BY voice_time DESC
        LIMIT 5
    `).all(since);
}

function getChatTop7d() {
    const since =
        Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);

    return db.prepare(`
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

function getVoiceTop7d() {
    const since =
        Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);

    return db.prepare(`
        SELECT
            user_id,
            SUM(amount) AS voice_time
        FROM activity_logs
        WHERE type = 'voice'
        AND created_at >= ?
        GROUP BY user_id
        ORDER BY voice_time DESC
        LIMIT 5
    `).all(since);
}

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

async function sendOrUpdate(channel, type, embed) {

    const old = leaderboardDB.prepare(
        "SELECT * FROM leaderboard_messages WHERE type = ?"
    ).get(type);

    if (old) {

        try {

            const message = await channel.messages.fetch(
                old.message_id
            );

            await message.edit({
                embeds: [embed]
            });

            return;

        } catch (error) {

            /*
             * Error 10008 means the Discord message
             * genuinely no longer exists.
             *
             * Other errors are treated as temporary/API
             * problems and the saved message ID is kept.
             */
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

    const message = await channel.send({
        embeds: [embed]
    });

    leaderboardDB.prepare(
        "INSERT INTO leaderboard_messages (type, message_id) VALUES (?, ?)"
    ).run(
        type,
        message.id
    );
}

module.exports = async (client) => {

    const guild = client.guilds.cache.first();

    if (!guild) return;

    const config = getConfig(guild.id);

    if (!config.leaderboard_channel) {
        console.log("No leaderboard channel configured.");
        return;
    }

    const channel = await client.channels.fetch(
        config.leaderboard_channel
    );

    if (!channel) return;

    let updating = false;

    async function updateLeaderboard() {

        if (updating) return;

        updating = true;

        try {

            const chat24hRaw = getChatTop24h();
            const voice24hRaw = getVoiceTop24h();

            const chat7dRaw = getChatTop7d();
            const voice7dRaw = getVoiceTop7d();

            const chat24h = await addUserData(
                channel,
                chat24hRaw
            );

            const voice24h = await addUserData(
                channel,
                voice24hRaw
            );

            const chat7d = await addUserData(
                channel,
                chat7dRaw
            );

            const voice7d = await addUserData(
                channel,
                voice7dRaw
            );

            const activity24hEmbed = createActivityEmbed(
                chat24h,
                voice24h,
                "24h"
            );

            const resetTimestamp = getNextMondayTimestamp();

            const activity7dEmbed = createActivityEmbed(
                chat7d,
                voice7d,
                "7d",
                resetTimestamp
            );

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

    async function updateWinnerRoles() {

        console.log("Updating weekly winner roles...");

        const config = getConfig(channel.guild.id);

        if (
            !config.chat_king_role ||
            !config.voice_king_role
        ) {
            console.log("Activity roles not configured.");
            return;
        }

        const chatTop = getChatTop7d()[0];
        const voiceTop = getVoiceTop7d()[0];

        const guild = channel.guild;

        const oldChatRole =
            guild.roles.cache.get(config.chat_king_role);

        if (oldChatRole) {

            for (const member of oldChatRole.members.values()) {

                if (!chatTop || member.id !== chatTop.user_id) {

                    await member.roles.remove(
                        config.chat_king_role
                    );
                }
            }
        }

        const oldVoiceRole =
            guild.roles.cache.get(config.voice_king_role);

        if (oldVoiceRole) {

            for (const member of oldVoiceRole.members.values()) {

                if (!voiceTop || member.id !== voiceTop.user_id) {

                    await member.roles.remove(
                        config.voice_king_role
                    );
                }
            }
        }

        if (chatTop) {

            const member = await guild.members
                .fetch(chatTop.user_id)
                .catch(() => null);

            if (member) {

                await member.roles.add(
                    config.chat_king_role
                );
            }
        }

        if (voiceTop) {

            const member = await guild.members
                .fetch(voiceTop.user_id)
                .catch(() => null);

            if (member) {

                await member.roles.add(
                    config.voice_king_role
                );
            }
        }
    }

    // Update immediately when ASTER starts.
    await updateLeaderboard();

    // Update leaderboards every 5 minutes.
    setInterval(
        updateLeaderboard,
        5 * 60 * 1000
    );

    // Check weekly winner roles every hour.
    setInterval(() => {

        const now = new Date();

        if (
            now.getDay() === 1 &&
            now.getHours() === 0
        ) {

            updateWinnerRoles();

            console.log(
                "Weekly winner roles refreshed"
            );
        }

    }, 60 * 60 * 1000);
};