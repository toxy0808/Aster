const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");
console.log("CONFIG FILE REACHED");
const { getConfig } = require("../utils/serverConfig");
console.log("CONFIG FILE LOADED");
module.exports = {
    name: "config",
    aliases: ["setup"],

    async execute(message) {

    console.log("CONFIG START");

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply("❌ You need Administrator permission.");
}

        const config = getConfig(message.guild.id);
console.log("CONFIG DATA:", config);
        const embed = new EmbedBuilder()
            .setColor("#FF006E")
            .setAuthor({
                name: "✦ ASTER Configuration",
                iconURL: message.client.user.displayAvatarURL()
            })
            .setDescription(
                "Configure ASTER settings using the buttons below."
            )
            .addFields(
{
name: "🏆 Leaderboard Channel",
value: config.leaderboard_channel
? `<#${config.leaderboard_channel}>`
: "Not set",
inline: true
},
{
name: "👑 Chat King Role",
value: config.chat_king_role
? `<@&${config.chat_king_role}>`
: "Not set",
inline: true
},
{
name: "🎙 Voice King Role",
value: config.voice_king_role
? `<@&${config.voice_king_role}>`
: "Not set",
inline: true
}
);


        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("config_leaderboard")
                    .setLabel("🏆 Leaderboard")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("config_roles")
                    .setLabel("👑 Roles")
                    .setStyle(ButtonStyle.Secondary)
            );


        message.channel.send({
            embeds: [embed],
            components: [buttons]
        });

    }
};