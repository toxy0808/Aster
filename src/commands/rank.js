const db = require("../database/database");
const { getXPData } = require("../utils/xp");
const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "rank",

    aliases: [
        "r",
        "profile"
    ],

    async execute(message, args) {

        const user = db.prepare(
            "SELECT * FROM users WHERE user_id = ?"
        ).get(message.author.id);

        if (!user) {
            return message.reply("No rank data found.");
        }

        const messages = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM activity_logs
            WHERE user_id = ?
            AND type = 'chat'
        `).get(message.author.id).total;

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

        const xpData = getXPData(user);

        const currentXP = xpData.currentXP;
        const nextXP = xpData.neededXP;

        const embed = new EmbedBuilder()
            .setTitle(`${message.author.username}'s Rank`)
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                {
                    name: "🏆 Activity Rank",
                    value: `#${rank}`,
                    inline: true
                },
                {
                    name: "💬 Messages",
                    value: `${messages}`,
                    inline: true
                },
                {
                    name: "⭐ Level",
                    value: `${user.level}`,
                    inline: true
                },
                {
                    name: "✨ XP",
                    value: `${currentXP}/${nextXP}`,
                    inline: true
                }
            );

        return message.reply({
            embeds: [embed]
        });
    }
};