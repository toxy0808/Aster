const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");
const { getConfig } = require("../utils/serverConfig");
module.exports = {
    name: "config",
    aliases: ["setup"],

    async execute(message) {

   

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply("❌ You need Administrator permission.");
}

        const config = getConfig(message.guild.id);

        const embed = new EmbedBuilder()
            .setColor("#FF006E")
            .setAuthor({
                name: "✦ ASTER Configuration",
                iconURL: message.client.user.displayAvatarURL()
            })
            .setDescription(
`Manage ASTER activity tracking settings.

🏆 Leaderboards
> Rankings, channels, reset timing

🎙️ Voice Tracking
> Voice activity detection settings

💬 Chat Tracking
> Message tracking settings

👑 Winner Roles
> Weekly winner rewards`
)


       const buttons = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId("config_leaderboard")
            .setLabel("🏆 Leaderboards")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("config_voice")
            .setLabel("🎙️ Voice")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("config_chat")
            .setLabel("💬 Chat")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("config_roles")
            .setLabel("👑 Roles")
            .setStyle(ButtonStyle.Secondary)
    );
await message.channel.send({
    embeds: [embed],
    components: [buttons]
});
    }
};