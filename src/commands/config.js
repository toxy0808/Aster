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

        // ========================================================
        // PERMISSIONS
        // ========================================================

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

        // ========================================================
        // ASTER CONFIG UI
        // ========================================================

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4FA3)

            // ====================================================
            // HEADER
            // ====================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "# ✦ ASTER / SERVER CONFIGURATION\n" +
                    "-# Customize how ASTER operates in this server.\n\n" +
                    "Configure activity tracking, leaderboards, reward roles " +
                    "and reputation from the sections below."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // ====================================================
            // LEADERBOARDS
            // ====================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 🏆 Leaderboards\n" +
                    "Manage leaderboard channels, ranking settings and " +
                    "activity-based leaderboard configuration."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // ====================================================
            // REWARD ROLES
            // ====================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 👑 Reward Roles\n" +
                    "Configure roles awarded to members who reach the " +
                    "top positions on activity leaderboards."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // ====================================================
            // REPUTATION
            // ====================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### ✨ Reputation\n" +
                    "Configure Staff and Funder roles, daily reputation " +
                    "limits and reputation rewards."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // ====================================================
            // PERMISSION NOTICE
            // ====================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### ⚙ Configuration Access\n" +
                    "Select a section below to open its settings.\n\n" +
                    "Only members with **Administrator** permission can " +
                    "modify these settings."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // ====================================================
            // FOOTER
            // ====================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "-# ◷ ASTER configuration panel\n" +
                    "-# ✦ Changes affect this server only"
                )
            );

        // ========================================================
        // CONFIGURATION BUTTONS
        // ========================================================

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