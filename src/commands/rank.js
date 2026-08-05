const db = require("../database/database");
const { getXPData } = require("../utils/xp");


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
            return message.reply(
                "No rank data found."
            );
        }



        const rank = db.prepare(
            "SELECT COUNT(*) + 1 AS rank FROM users WHERE xp > ?"
        ).get(user.xp).rank;


const xpData = getXPData(user);

const currentXP = xpData.currentXP;
const nextXP = xpData.neededXP;
const percent = xpData.percent;
const { EmbedBuilder } = require("discord.js");

const embed = new EmbedBuilder()
    .setTitle(`${message.author.username}'s Rank`)
    .setThumbnail(message.author.displayAvatarURL())
    .addFields(
        {
            name: "Level",
            value: `${user.level}`,
            inline: true
        },
        {
            name: "XP",
            value: `${currentXP}/${nextXP}`,
            inline: true
        },
        {
            name: "Rank",
            value: `#${rank}`,
            inline: true
        },
        {
            name: "Messages",
            value: `${user.messages}`,
            inline: true
        }
    );

return message.reply({ embeds: [embed] });
}
};