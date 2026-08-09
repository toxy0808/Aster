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
                    "# ✦ ASTER • Server Configuration\n" +
                    "Customize how ASTER works in your server.\n\n" +
                    "Use the sections below to configure activity tracking, " +
                    "leaderboards, reward roles and reputation."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 🏆 Leaderboards\n" +
                    "Manage leaderboard channels, ranking settings and " +
                    "activity-based leaderboard configuration."
                )
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 👑 Reward Roles\n" +
                    "Configure the roles awarded to members who reach the " +
                    "top positions on the activity leaderboards."
                )
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### ✨ Reputation\n" +
                    "Configure the reputation system, including Staff and " +
                    "Funder roles, daily reputation limits and reputation rewards."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### ⚙️ Configuration\n" +
                    "Choose a section below to open its settings.\n\n" +
                    "Only members with **Administrator** permission can modify " +
                    "these settings."
                )
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("config_leaderboard")
                    .setLabel("🏆 Leaderboards")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("config_roles")
                    .setLabel("👑 Reward Roles")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("config_rep")
                    .setLabel("✨ Reputation")
                    .setStyle(ButtonStyle.Success)
            );

        return message.channel.send({
            components: [
                container,
                row
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
};