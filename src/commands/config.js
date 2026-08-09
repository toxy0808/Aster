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

module.exports = {
    name: "config",
    aliases: ["setup"],

    async execute(message) {

        if (!message.member.permissions.has(
            PermissionFlagsBits.Administrator
        )) {
            return message.reply(
                "❌ You need Administrator permission."
            );
        }

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
                    "Manage activity rankings and leaderboard settings.\n\n" +
                    "### 👑 Winner Roles\n" +
                    "Configure activity leaderboard rewards.\n\n" +
                    "### ✨ Reputation\n" +
                    "Manage reputation limits, roles and rewards."
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

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("config_leaderboard")
                    .setLabel("🏆 Leaderboards")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("config_roles")
                    .setLabel("👑 Winner Roles")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("config_rep")
                    .setLabel("✨ Reputation")
                    .setStyle(ButtonStyle.Success)
            );

        return message.channel.send({
            components: [
                container,
                buttons
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
};