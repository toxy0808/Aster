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

// Initialize donor database tables
require("../database/donor");

function isAdmin(interaction) {
    return interaction.member?.permissions?.has(
        PermissionFlagsBits.Administrator
    );
}

function getSettings(guildId) {
    let settings = db.prepare(`
        SELECT *
        FROM donor_settings
        WHERE guild_id = ?
    `).get(guildId);

    if (!settings) {
        db.prepare(`
            INSERT INTO donor_settings (
                guild_id,
                enabled,
                announcements_enabled,
                logging_enabled,
                announcement_message
            )
            VALUES (?, 0, 1, 1, ?)
        `).run(
            guildId,
            "☕ **{donor}** just supported **{amount}** — thank you for helping keep ASTER running!"
        );

        settings = db.prepare(`
            SELECT *
            FROM donor_settings
            WHERE guild_id = ?
        `).get(guildId);
    }

    return settings;
}

function buildPanel(guildId) {
    const settings = getSettings(guildId);

    const enabled = Number(settings.enabled) === 1;
    const announcements = Number(settings.announcements_enabled) === 1;
    const logging = Number(settings.logging_enabled) === 1;

    const tiers = db.prepare(`
        SELECT tier_id, role_id, amount, enabled
        FROM donor_tiers
        WHERE guild_id = ?
        ORDER BY amount ASC
    `).all(guildId);

    const container = new ContainerBuilder()
        .setAccentColor(0x5865F2)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "# ✦ ASTER • Donor System\n" +
                "-# Manage Ko-fi donations, announcements, logging and donor tiers."
            ),
            new SeparatorBuilder(),
            new TextDisplayBuilder().setContent(
                `### ⚙️ System\n` +
                `Status: **${enabled ? "Enabled" : "Disabled"}**\n` +
                `Ko-fi: ${settings.provider_url ? `[Configured](${settings.provider_url})` : "**Not configured**"}`
            ),
            new SeparatorBuilder(),
            new TextDisplayBuilder().setContent(
                `### 📢 Notifications\n` +
                `Announcements: **${announcements ? "On" : "Off"}**\n` +
                `Announcement channel: ${settings.announcement_channel_id ? `<#${settings.announcement_channel_id}>` : "**Not set**"}\n` +
                `Logging: **${logging ? "On" : "Off"}**\n` +
                `Log channel: ${settings.log_channel_id ? `<#${settings.log_channel_id}>` : "**Not set**"}`
            ),
            new SeparatorBuilder(),
            new TextDisplayBuilder().setContent(
                `### 🏆 Donor Tiers\n` +
                `${tiers.length ? tiers.map(t =>
                    `• **${t.tier_id}** → <@&${t.role_id}> • **$${Number(t.amount).toFixed(0)}**`
                ).join("\n") : "-# No donor tiers configured."}`
            )
        );

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("donor_toggle")
            .setLabel(enabled ? "Disable System" : "Enable System")
            .setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),

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
            .setLabel(announcements ? "Announcements: On" : "Announcements: Off")
            .setStyle(announcements ? ButtonStyle.Success : ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("donor_toggle_logging")
            .setLabel(logging ? "Logging: On" : "Logging: Off")
            .setStyle(logging ? ButtonStyle.Success : ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("donor_message")
            .setLabel("Announcement Message")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("donor_test")
            .setLabel("Test Announcement")
            .setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("donor_add_tier")
            .setLabel("Add Tier")
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId("donor_manage_tiers")
            .setLabel("Manage Tiers")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("donor_view")
            .setLabel("View Config")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("donor_reset")
            .setLabel("Reset Settings")
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId("donor_refresh")
            .setLabel("Refresh")
            .setStyle(ButtonStyle.Secondary)
    );

    return [container, row1, row2, row3];
}

module.exports = {
    name: "donorconfig",

    data: new SlashCommandBuilder()
        .setName("donorconfig")
        .setDescription("Manage the ASTER donor system")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    async execute(interaction) {
        if (!isAdmin(interaction)) {
            return interaction.reply({
                content: "⛔ Administrator permission required.",
                ephemeral: true
            });
        }

        return interaction.reply({
            components: buildPanel(interaction.guildId),
            flags:
                MessageFlags.IsComponentsV2 |
                MessageFlags.Ephemeral
        });
    },

    buildPanel
};