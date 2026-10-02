const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const db = require("../database/database");
const donorDb = require("../database/donor");

function isAdmin(interaction) {
    return interaction.memberPermissions?.has(
        PermissionFlagsBits.Administrator
    );
}

function getSettings(guildId) {
    const settings = donorDb.getSettings(String(guildId));

    return {
        enabled: Number(settings?.enabled ?? 1),
        kofi_url: String(settings?.kofi_url ?? ""),
        announcement_channel_id:
            settings?.announcement_channel_id
                ? String(settings.announcement_channel_id)
                : null,
        log_channel_id:
            settings?.log_channel_id
                ? String(settings.log_channel_id)
                : null,
        announcements_enabled:
            Number(settings?.announcements_enabled ?? 1),
        logging_enabled:
            Number(settings?.logging_enabled ?? 1),
        announcement_message:
            String(
                settings?.announcement_message ??
                "Thank you {user} for supporting ASTER! 💜"
            )
    };
}

function buildPanel(guildId) {
    const settings = getSettings(guildId);
    const tiers = donorDb.listTiers(String(guildId)) || [];

    const systemStatus = settings.enabled
        ? "🟢 Enabled"
        : "🔴 Disabled";

    const announcementStatus = settings.announcements_enabled
        ? "🟢 Enabled"
        : "🔴 Disabled";

    const loggingStatus = settings.logging_enabled
        ? "🟢 Enabled"
        : "🔴 Disabled";

    const kofi = settings.kofi_url || "Not configured";

    const announcementChannel =
        settings.announcement_channel_id
            ? `<#${settings.announcement_channel_id}>`
            : "Not configured";

    const logChannel =
        settings.log_channel_id
            ? `<#${settings.log_channel_id}>`
            : "Not configured";

    const tierText = tiers.length
        ? tiers
            .map((tier) => {
                const status = Number(tier.enabled)
                    ? "🟢"
                    : "🔴";

                const role = tier.role_id
                    ? `<@&${tier.role_id}>`
                    : "No role";

                return `${status} **${String(tier.tier_id)}** — $${Number(
                    tier.amount || 0
                ).toFixed(0)} — ${role}`;
            })
            .join("\n")
        : "No donor tiers configured.";

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "# 💜 ASTER Donor Configuration"
        )
    );

    container.addSeparatorComponents(
        new SeparatorBuilder()
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            [
                "## System",
                `**Status:** ${systemStatus}`,
                `**Ko-fi:** ${kofi}`,
                `**Announcements:** ${announcementStatus}`,
                `**Announcement channel:** ${announcementChannel}`,
                `**Logging:** ${loggingStatus}`,
                `**Log channel:** ${logChannel}`
            ].join("\n")
        )
    );

    container.addSeparatorComponents(
        new SeparatorBuilder()
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            [
                "## Announcement Message",
                settings.announcement_message ||
                    "Thank you {user} for supporting ASTER! 💜"
            ].join("\n")
        )
    );

    container.addSeparatorComponents(
        new SeparatorBuilder()
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            [
                "## Donor Tiers",
                tierText
            ].join("\n")
        )
    );

    container.addSeparatorComponents(
        new SeparatorBuilder()
    );

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("donor_toggle")
            .setLabel(
                settings.enabled
                    ? "Disable System"
                    : "Enable System"
            )
            .setStyle(
                settings.enabled
                    ? ButtonStyle.Danger
                    : ButtonStyle.Success
            ),

        new ButtonBuilder()
            .setCustomId("donor_kofi")
            .setLabel("Ko-fi URL")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("donor_announcement_channel")
            .setLabel("Announcement Channel")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("donor_log_channel")
            .setLabel("Log Channel")
            .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("donor_toggle_announcements")
            .setLabel(
                settings.announcements_enabled
                    ? "Disable Announcements"
                    : "Enable Announcements"
            )
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("donor_toggle_logging")
            .setLabel(
                settings.logging_enabled
                    ? "Disable Logging"
                    : "Enable Logging"
            )
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("donor_announcement_message")
            .setLabel("Announcement Message")
            .setStyle(ButtonStyle.Primary)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("donor_test")
            .setLabel("Test Announcement")
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId("donor_add_tier")
            .setLabel("Add Tier")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("donor_manage_tiers")
            .setLabel("Manage Tiers")
            .setStyle(ButtonStyle.Secondary)
    );

    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("donor_view_config")
            .setLabel("View Config")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("donor_reset")
            .setLabel("Reset")
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId("donor_refresh")
            .setLabel("Refresh")
            .setStyle(ButtonStyle.Secondary)
    );

    container.addActionRowComponents(row1);
    container.addActionRowComponents(row2);
    container.addActionRowComponents(row3);
    container.addActionRowComponents(row4);

    return [container];
}

module.exports = {
    name: "donorconfig",

    data: new SlashCommandBuilder()
        .setName("donorconfig")
        .setDescription("Configure the ASTER donor system")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator.toString()
        ),

    async execute(message) {
        const interaction = message.interaction || message;

        if (!isAdmin(interaction)) {
            return interaction.reply({
                content: "❌ You need **Manage Server** permission to use this.",
                flags: MessageFlags.Ephemeral
            });
        }

        const components = buildPanel(interaction.guild.id);

        return interaction.reply({
            components,
            flags:
                MessageFlags.IsComponentsV2 |
                MessageFlags.Ephemeral
        });
    },

    buildPanel
};