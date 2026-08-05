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


        if (!user) {
            return message.reply("No activity data found.");
        }


        const rank = db.prepare(
            "SELECT COUNT(*) + 1 AS rank FROM users WHERE xp > ?"
        ).get(user.xp).rank;


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
                    value: `${user.messages}`,
                    inline: true
                },
                {
                    name: "🎙️ Voice",
                    value: `${user.voice_time || 0} minutes`,
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