const db = require("../database/database");
const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "activity",

    aliases: [
        "act",
        "stats"
    ],

    async execute(message, args) {

       const user = db.prepare(
    "SELECT * FROM users WHERE user_id = ?"
).get(message.author.id);

const messages = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM activity_logs
    WHERE user_id = ?
    AND type = 'chat'
`).get(message.author.id).total;

const voice = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM activity_logs
    WHERE user_id = ?
    AND type = 'voice'
`).get(message.author.id).total;


        if (!user) {
            return message.reply("No activity data found.");
        }
const rank = db.prepare(`
    SELECT COUNT(*) + 1 AS rank
    FROM (
        SELECT user_id, SUM(amount) AS messages
        FROM activity_logs
        WHERE type = 'chat'
        GROUP BY user_id
    )
    WHERE messages > ?
`).get(messages).rank;


        const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}'s Activity`)
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                {
                    name: "🏆 Rank",
                    value: `#${rank}`,
                    inline: true
                },
                {
                    name: "💬 Messages",
                    value:`${messages}`,
                    inline: true
                },
                {
                    name: "🎙️ Voice",
                    value: `${voice} minutes`,
                    inline: true
                },
                {
                    name: "⭐ Level",
                    value: `${user.level}`,
                    inline: true
                }
            );


        message.reply({
            embeds: [embed]
        });

    }
};