const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const { getConfig } = require("../utils/serverConfig");

module.exports = {
    name: "config",
    aliases: ["setup"],

    async execute(message) {

        if (
            !message.member.permissions.has(
                PermissionFlagsBits.Administrator
            )
        ) {
            return message.reply(
                "❌ You need Administrator permission."
            );
        }

        const config = getConfig(message.guild.id);

        const container = new ContainerBuilder()
            .setAccentColor(0xFF006E)

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "# ✦ ASTER Configuration\n" +
                    "Manage ASTER's server systems and settings."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 🏆 Leaderboards\n" +
                    "Rankings, channels and activity leaderboard settings."
                )
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 🎙️ Voice Tracking\n" +
                    "Configure voice activity detection."
                )
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 💬 Chat Tracking\n" +
                    "Configure message and chat activity tracking."
                )
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 👑 Winner Roles\n" +
                    "Configure activity leaderboard rewards."
                )
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### ✨ Reputation\n" +
                    "Configure positive/negative reputation, daily limits and rewards."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "Select a system below to manage its settings."
                )
            );

        const row1 = new ActionRowBuilder()
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
                    .setStyle(ButtonStyle.Secondary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("config_roles")
                    .setLabel("👑 Roles")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("config_rep")
                    .setLabel("✨ Reputation")
                    .setStyle(ButtonStyle.Success)
            );

        return message.channel.send({
            components: [
                container,
                row1,
                row2
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
};