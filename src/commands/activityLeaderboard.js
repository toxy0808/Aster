console.log("ACTIVITY LB FILE LOADED");
const db = require("../database/database");
const createActivityEmbed = require("../utils/activityEmbed");

module.exports = {
    name: "activitylb",

    aliases: [
        "actlb",
        "activityleaderboard"
    ],

    async execute(message) {

        function getChatTop24h() {
            const since = Math.floor(Date.now() / 1000) - 86400;

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
            const since = Math.floor(Date.now() / 1000) - 86400;

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


        async function addUserData(users) {

            return Promise.all(
                users.map(async (user) => {

                    const member = await message.guild.members
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


        const chatRaw = getChatTop24h();
        const voiceRaw = getVoiceTop24h();


        const chat = await addUserData(chatRaw);
        const voice = await addUserData(voiceRaw);


        await message.reply({
    embeds: [
        createActivityEmbed(
            chat,
            voice,
            "24h"
        )
    ]
});

    }
};