const {
    PermissionFlagsBits,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    RoleSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const db = require("../database/database");
const donorDb = require("../database/donor");
const donorCommand = require("../commands/donorconfig");

// ============================================================
// HELPERS
// ============================================================

function isAdmin(interaction) {
    return interaction.memberPermissions?.has(
        PermissionFlagsBits.Administrator
    );
}

function ephemeral(content) {
    return {
        content,
        flags: MessageFlags.Ephemeral
    };
}

function getSettings(guildId) {
    return donorDb.getSettings(String(guildId));
}

function getPanel(guildId) {
    return donorCommand.buildPanel(String(guildId));
}

async function refresh(interaction) {
    return interaction.update({
        components: getPanel(interaction.guild.id),
        flags: MessageFlags.IsComponentsV2
    });
}

async function replyError(interaction, message) {
    if (interaction.replied || interaction.deferred) {
        return interaction.followUp(
            ephemeral(message)
        );
    }

    return interaction.reply(
        ephemeral(message)
    );
}

// ============================================================
// CHANNEL PICKER
// ============================================================

function buildChannelPicker(type) {
    const isAnnouncement =
        type === "announcement";

    const menu = new ChannelSelectMenuBuilder()
        .setCustomId(
            isAnnouncement
                ? "donor_select_announcement_channel"
                : "donor_select_log_channel"
        )
        .setPlaceholder(
            isAnnouncement
                ? "Select announcement channel..."
                : "Select logging channel..."
        )
        .setChannelTypes(ChannelType.GuildText)
        .setMinValues(1)
        .setMaxValues(1);

    const row = new ActionRowBuilder()
        .addComponents(menu);

    const back = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("donor_refresh")
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, back];
}

// ============================================================
// KO-FI MODAL
// ============================================================

function buildKofiModal() {
    const modal = new ModalBuilder()
        .setCustomId("donor_kofi_modal")
        .setTitle("ASTER • Ko-fi URL");

    const input = new TextInputBuilder()
        .setCustomId("donor_kofi_url")
        .setLabel("Ko-fi URL")
        .setPlaceholder("https://ko-fi.com/yourname")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(500);

    modal.addComponents(
        new ActionRowBuilder().addComponents(input)
    );

    return modal;
}

// ============================================================
// ANNOUNCEMENT MESSAGE MODAL
// ============================================================

function buildAnnouncementMessageModal(currentMessage) {
    const modal = new ModalBuilder()
        .setCustomId("donor_announcement_message_modal")
        .setTitle("ASTER • Announcement Message");

    const input = new TextInputBuilder()
        .setCustomId("donor_announcement_message_input")
        .setLabel("Announcement message")
        .setPlaceholder(
            "Thank you {user} for supporting ASTER! 💜"
        )
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000)
        .setValue(
            String(
                currentMessage ||
                "Thank you {user} for supporting ASTER! 💜"
            ).slice(0, 2000)
        );

    modal.addComponents(
        new ActionRowBuilder().addComponents(input)
    );

    return modal;
}

// ============================================================
// ADD TIER MODAL
// ============================================================

function buildAddTierModal() {
    const modal = new ModalBuilder()
        .setCustomId("donor_add_tier_modal")
        .setTitle("ASTER • Add Donor Tier");

    const tierId = new TextInputBuilder()
        .setCustomId("donor_tier_id")
        .setLabel("Tier name")
        .setPlaceholder("Example: supporter")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);

    const amount = new TextInputBuilder()
        .setCustomId("donor_tier_amount")
        .setLabel("Minimum USD amount")
        .setPlaceholder("Example: 5")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10);

    modal.addComponents(
        new ActionRowBuilder().addComponents(tierId),
        new ActionRowBuilder().addComponents(amount)
    );

    return modal;
}

// ============================================================
// TIER ROLE SELECT
// ============================================================

function buildTierRoleSelect(tierId, amount) {
    const customId =
        `donor_tier_role_${tierId}_${amount}`;

    const menu = new RoleSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder("Select the role for this tier")
        .setMinValues(1)
        .setMaxValues(1);

    return [
        new ActionRowBuilder()
            .addComponents(menu),

        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("donor_refresh")
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

// ============================================================
// MANAGE TIERS
// ============================================================

function buildTierManager(guildId) {
    const tiers =
        donorDb.listTiers(String(guildId)) || [];

    if (!tiers.length) {
        return [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("donor_refresh")
                        .setLabel("Back")
                        .setStyle(ButtonStyle.Secondary)
                )
        ];
    }

    const menu = new StringSelectMenuBuilder()
        .setCustomId("donor_manage_tiers_select")
        .setPlaceholder("Select a tier to manage...")
        .setMinValues(1)
        .setMaxValues(1);

    for (const tier of tiers.slice(0, 25)) {
        const enabled =
            Number(tier.enabled ?? 1) === 1;

        menu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(
                    String(tier.tier_id).slice(0, 100)
                )
                .setDescription(
                    `$${Number(tier.amount || 0).toFixed(0)} • ${
                        enabled
                            ? "Enabled"
                            : "Disabled"
                    }`
                )
                .setValue(
                    String(tier.tier_id)
                )
        );
    }

    return [
        new ActionRowBuilder()
            .addComponents(menu),

        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("donor_refresh")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

// ============================================================
// SELECTED TIER ACTIONS
// ============================================================

function buildTierActions(guildId, tierId) {
    const tier =
        donorDb.getTier(
            String(guildId),
            String(tierId)
        );

    if (!tier) {
        return null;
    }

    const enabled =
        Number(tier.enabled ?? 1) === 1;

    return [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        `donor_tier_toggle_${tier.tier_id}`
                    )
                    .setLabel(
                        enabled
                            ? "Disable Tier"
                            : "Enable Tier"
                    )
                    .setStyle(
                        enabled
                            ? ButtonStyle.Danger
                            : ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `donor_tier_delete_${tier.tier_id}`
                    )
                    .setLabel("Delete Tier")
                    .setStyle(ButtonStyle.Danger)
            ),

        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("donor_manage_tiers")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

// ============================================================
// MAIN HANDLER
// ============================================================

module.exports = async function handleDonorConfigInteraction(
    interaction
) {
    try {
        if (!interaction.guild) {
            return;
        }

        if (!isAdmin(interaction)) {
            return replyError(
                interaction,
                "❌ You need the **Administrator** permission to use this."
            );
        }

        const id =
            String(interaction.customId || "");

        // ====================================================
        // REFRESH / BACK
        // ====================================================

        if (id === "donor_refresh") {
            return refresh(interaction);
        }

        // ====================================================
        // SYSTEM TOGGLE
        // ====================================================

        if (id === "donor_toggle") {
            const settings =
                getSettings(interaction.guild.id);

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    enabled:
                        Number(settings.enabled) === 1
                            ? 0
                            : 1
                }
            );

            return refresh(interaction);
        }

        // ====================================================
        // ANNOUNCEMENTS TOGGLE
        // ====================================================

        if (id === "donor_toggle_announcements") {
            const settings =
                getSettings(interaction.guild.id);

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    announcements_enabled:
                        Number(
                            settings.announcements_enabled
                        ) === 1
                            ? 0
                            : 1
                }
            );

            return refresh(interaction);
        }

        // ====================================================
        // LOGGING TOGGLE
        // ====================================================

        if (id === "donor_toggle_logging") {
            const settings =
                getSettings(interaction.guild.id);

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    logging_enabled:
                        Number(
                            settings.logging_enabled
                        ) === 1
                            ? 0
                            : 1
                }
            );

            return refresh(interaction);
        }

        // ====================================================
        // KO-FI BUTTON
        // ====================================================

        if (id === "donor_kofi") {
            return interaction.showModal(
                buildKofiModal()
            );
        }

        // ====================================================
        // KO-FI MODAL
        // ====================================================

        if (
            id === "donor_kofi_modal" ||
            id === "donor_kofi_submit"
        ) {
            const url =
                interaction.fields
                    .getTextInputValue(
                        "donor_kofi_url"
                    )
                    .trim();

            if (
                url &&
                !/^https?:\/\/.+/i.test(url)
            ) {
                return interaction.reply(
                    ephemeral(
                        "❌ Please enter a valid URL."
                    )
                );
            }

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    kofi_url: url
                }
            );

            return interaction.reply({
                content:
                    "✅ Ko-fi URL updated.",
                flags:
                    MessageFlags.Ephemeral
            });
        }

        // ====================================================
        // ANNOUNCEMENT CHANNEL BUTTON
        // ====================================================

        if (id === "donor_announcement_channel") {
            return interaction.update({
                content: "",
                components:
                    buildChannelPicker(
                        "announcement"
                    )
            });
        }

        // ====================================================
        // LOG CHANNEL BUTTON
        // ====================================================

        if (id === "donor_log_channel") {
            return interaction.update({
                content: "",
                components:
                    buildChannelPicker("log")
            });
        }

        // ====================================================
        // ANNOUNCEMENT CHANNEL SELECT
        // ====================================================

        if (
            id ===
            "donor_select_announcement_channel"
        ) {
            const channelId =
                interaction.values?.[0];

            if (!channelId) {
                return replyError(
                    interaction,
                    "❌ No channel selected."
                );
            }

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    announcement_channel_id:
                        channelId
                }
            );

            return refresh(interaction);
        }

        // ====================================================
        // LOG CHANNEL SELECT
        // ====================================================

        if (
            id === "donor_select_log_channel"
        ) {
            const channelId =
                interaction.values?.[0];

            if (!channelId) {
                return replyError(
                    interaction,
                    "❌ No channel selected."
                );
            }

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    log_channel_id:
                        channelId
                }
            );

            return refresh(interaction);
        }

        // ====================================================
        // ANNOUNCEMENT MESSAGE
        // ====================================================

        if (id === "donor_announcement_message") {
            const settings =
                getSettings(
                    interaction.guild.id
                );

            return interaction.showModal(
                buildAnnouncementMessageModal(
                    settings?.announcement_message
                )
            );
        }

        // ====================================================
        // ANNOUNCEMENT MESSAGE MODAL
        // ====================================================

        if (
            id ===
            "donor_announcement_message_modal"
        ) {
            const message =
                interaction.fields
                    .getTextInputValue(
                        "donor_announcement_message_input"
                    )
                    .trim();

            if (!message) {
                return interaction.reply(
                    ephemeral(
                        "❌ The announcement message cannot be empty."
                    )
                );
            }

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    announcement_message:
                        message
                }
            );

            return interaction.reply({
                content:
                    "✅ Announcement message updated.",
                flags:
                    MessageFlags.Ephemeral
            });
        }

        // ====================================================
        // ADD TIER
        // ====================================================

        if (id === "donor_add_tier") {
            return interaction.showModal(
                buildAddTierModal()
            );
        }

        // ====================================================
        // ADD TIER MODAL
        // ====================================================

        if (id === "donor_add_tier_modal") {
            const tierId =
                interaction.fields
                    .getTextInputValue(
                        "donor_tier_id"
                    )
                    .trim();

            const amountText =
                interaction.fields
                    .getTextInputValue(
                        "donor_tier_amount"
                    )
                    .trim();

            const amount =
                Number(amountText);

            if (!tierId) {
                return interaction.reply(
                    ephemeral(
                        "❌ Tier name cannot be empty."
                    )
                );
            }

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {
                return interaction.reply(
                    ephemeral(
                        "❌ Enter a valid USD amount greater than 0."
                    )
                );
            }

            if (
                donorDb.getTier(
                    interaction.guild.id,
                    tierId
                )
            ) {
                return interaction.reply(
                    ephemeral(
                        `❌ A tier named **${tierId}** already exists.`
                    )
                );
            }

            return interaction.reply({
                content:
                    `Choose the Discord role for **${tierId}** ($${amount.toFixed(0)}):`,
                components:
                    buildTierRoleSelect(
                        tierId,
                        amount
                    ),
                flags:
                    MessageFlags.Ephemeral
            });
        }

        // ====================================================
        // TIER ROLE SELECT
        // ====================================================

        if (
            interaction.isRoleSelectMenu() &&
            id.startsWith("donor_tier_role_")
        ) {
            const roleId =
                interaction.values?.[0];

            const prefix =
                "donor_tier_role_";

            const data =
                id.slice(prefix.length);

            const parts =
                data.split("_");

            if (parts.length < 2) {
                return replyError(
                    interaction,
                    "❌ Invalid tier selection."
                );
            }

            const amount =
                Number(parts.pop());

            const tierId =
                parts.join("_");

            if (
                !tierId ||
                !Number.isFinite(amount)
            ) {
                return replyError(
                    interaction,
                    "❌ Invalid tier data."
                );
            }

            const role =
                interaction.guild.roles.cache.get(
                    roleId
                );

            if (!role) {
                return replyError(
                    interaction,
                    "❌ That role no longer exists."
                );
            }

            donorDb.setTier(
                interaction.guild.id,
                tierId,
                roleId,
                amount
            );

            return interaction.reply({
                content:
                    `✅ Donor tier **${tierId}** created.\n\n` +
                    `💰 Amount: **$${amount.toFixed(0)}**\n` +
                    `🎭 Role: <@&${roleId}>`,
                flags:
                    MessageFlags.Ephemeral
            });
        }

        // ====================================================
        // MANAGE TIERS
        // ====================================================

        if (id === "donor_manage_tiers") {
            return interaction.update({
                components:
                    buildTierManager(
                        interaction.guild.id
                    ),
                flags:
                    MessageFlags.IsComponentsV2
            });
        }

        // ====================================================
        // MANAGE TIERS SELECT
        // ====================================================

        if (
            id === "donor_manage_tiers_select"
        ) {
            const tierId =
                interaction.values?.[0];

            if (!tierId) {
                return replyError(
                    interaction,
                    "❌ No tier selected."
                );
            }

            const actions =
                buildTierActions(
                    interaction.guild.id,
                    tierId
                );

            if (!actions) {
                return replyError(
                    interaction,
                    "❌ That tier no longer exists."
                );
            }

            const tier =
                donorDb.getTier(
                    interaction.guild.id,
                    tierId
                );

            return interaction.update({
                content:
                    `**Donor Tier:** ${tier.tier_id}\n` +
                    `**Amount:** $${Number(
                        tier.amount || 0
                    ).toFixed(0)}\n` +
                    `**Role:** ${
                        tier.role_id
                            ? `<@&${tier.role_id}>`
                            : "None"
                    }\n` +
                    `**Status:** ${
                        Number(tier.enabled ?? 1)
                            ? "Enabled"
                            : "Disabled"
                    }`,
                components: actions
            });
        }

        // ====================================================
        // TIER TOGGLE
        // ====================================================

        if (
            id.startsWith(
                "donor_tier_toggle_"
            )
        ) {
            const tierId =
                id.slice(
                    "donor_tier_toggle_".length
                );

            const tier =
                donorDb.toggleTier(
                    interaction.guild.id,
                    tierId
                );

            if (!tier) {
                return replyError(
                    interaction,
                    "❌ Tier not found."
                );
            }

            const actions =
                buildTierActions(
                    interaction.guild.id,
                    tierId
                );

            return interaction.update({
                components: actions
            });
        }

        // ====================================================
        // TIER DELETE
        // ====================================================

        if (
            id.startsWith(
                "donor_tier_delete_"
            )
        ) {
            const tierId =
                id.slice(
                    "donor_tier_delete_".length
                );

            const tier =
                donorDb.getTier(
                    interaction.guild.id,
                    tierId
                );

            if (!tier) {
                return replyError(
                    interaction,
                    "❌ Tier not found."
                );
            }

            donorDb.removeTier(
                interaction.guild.id,
                tierId
            );

            return interaction.update({
                components:
                    buildTierManager(
                        interaction.guild.id
                    )
            });
        }

        // ====================================================
        // VIEW CONFIG
        // ====================================================

        if (id === "donor_view_config") {
            const settings =
                getSettings(
                    interaction.guild.id
                );

            const tiers =
                donorDb.listTiers(
                    interaction.guild.id
                ) || [];

            const tierText =
                tiers.length
                    ? tiers
                        .map(
                            (tier) =>
                                `• **${tier.tier_id}** — $${Number(
                                    tier.amount || 0
                                ).toFixed(0)} — ${
                                    tier.role_id
                                        ? `<@&${tier.role_id}>`
                                        : "No role"
                                }`
                        )
                        .join("\n")
                    : "No tiers configured.";

            return interaction.reply({
                content:
                    `## 💜 ASTER Donor Configuration\n\n` +
                    `**System:** ${
                        Number(settings.enabled)
                            ? "Enabled"
                            : "Disabled"
                    }\n` +
                    `**Ko-fi:** ${
                        settings.kofi_url ||
                        "Not configured"
                    }\n` +
                    `**Announcements:** ${
                        Number(
                            settings.announcements_enabled
                        )
                            ? "Enabled"
                            : "Disabled"
                    }\n` +
                    `**Announcement Channel:** ${
                        settings.announcement_channel_id
                            ? `<#${settings.announcement_channel_id}>`
                            : "Not configured"
                    }\n` +
                    `**Logging:** ${
                        Number(
                            settings.logging_enabled
                        )
                            ? "Enabled"
                            : "Disabled"
                    }\n` +
                    `**Log Channel:** ${
                        settings.log_channel_id
                            ? `<#${settings.log_channel_id}>`
                            : "Not configured"
                    }\n\n` +
                    `### Tiers\n${tierText}`,
                flags:
                    MessageFlags.Ephemeral
            });
        }

        // ====================================================
        // RESET
        // ====================================================

        if (id === "donor_reset") {
            donorDb.resetSettings(
                interaction.guild.id
            );

            return refresh(interaction);
        }

        // ====================================================
        // TEST ANNOUNCEMENT
        // ====================================================

        if (id === "donor_test") {
            const settings =
                getSettings(
                    interaction.guild.id
                );

            if (
                !settings.announcement_channel_id
            ) {
                return replyError(
                    interaction,
                    "❌ No announcement channel is configured."
                );
            }

            const channel =
                await interaction.guild.channels
                    .fetch(
                        settings.announcement_channel_id
                    )
                    .catch(() => null);

            if (!channel) {
                return replyError(
                    interaction,
                    "❌ I couldn't access the configured announcement channel."
                );
            }

            if (
                !channel.isTextBased()
            ) {
                return replyError(
                    interaction,
                    "❌ The configured announcement channel is not a text channel."
                );
            }

            const message =
                String(
                    settings.announcement_message ||
                    "Thank you {user} for supporting ASTER! 💜"
                )
                    .replace(
                        /\{user\}/gi,
                        `<@${interaction.user.id}>`
                    )
                    .replace(
                        /\{username\}/gi,
                        interaction.user.username
                    );

            await channel.send({
                content:
                    `🧪 **TEST DONATION**\n\n${message}`
            });

            return interaction.reply({
                content:
                    "✅ Test announcement sent.",
                flags:
                    MessageFlags.Ephemeral
            });
        }

        // ====================================================
        // UNKNOWN DONOR INTERACTION
        // ====================================================

        console.warn(
            `ASTER: Unhandled donor interaction: ${id}`
        );

        return replyError(
            interaction,
            "❌ This donor configuration control is not implemented."
        );

    } catch (error) {
        console.error(
            "ASTER: Donor configuration interaction failed:",
            error
        );

        return replyError(
            interaction,
            "❌ Something went wrong while processing that donor configuration action."
        ).catch(() => {});
    }
};