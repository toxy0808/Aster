const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const donorDb =
    require("../database/donor");

const donorUI =
    require("../utils/asterUI/donor");

const {
    replaceDonorVariables
} =
    require("../utils/asterUI/donorVariables");

/* ============================================================
   ADMIN CHECK
   ============================================================ */

function isAdmin(interaction) {

    return interaction.memberPermissions?.has(
        PermissionFlagsBits.Administrator
    );
}

/* ============================================================
   ERROR RESPONSE
   ============================================================ */

async function errorResponse(
    interaction,
    message
) {

    const payload = {

        content:
            `❌ **Donor System Error**\n\n${message}`,

        flags:
            MessageFlags.Ephemeral
    };

    try {

        if (
            interaction.replied ||
            interaction.deferred
        ) {

            return interaction.followUp(
                payload
            );
        }

        return interaction.reply(
            payload
        );

    } catch {

        return null;
    }
}

/* ============================================================
   REFRESH
   ============================================================ */

async function refresh(interaction) {

    const settings =
        donorDb.getSettings(
            interaction.guild.id
        );

    const tiers =
        donorDb.listTiers(
            interaction.guild.id
        );

    return interaction.update({

        components:
            donorUI.buildPanel(
                settings,
                tiers
            ),

        flags:
            MessageFlags.IsComponentsV2
    });
}

/* ============================================================
   MAIN HANDLER
   ============================================================ */

module.exports = async function (
    interaction
) {

    try {

        if (!interaction.guild) {
            return;
        }

        if (!isAdmin(interaction)) {

            return errorResponse(
                interaction,
                "Administrator permissions are required."
            );
        }

        const id =
            interaction.customId;

        /* =====================================================
           REFRESH
           ===================================================== */

        if (
            id === "donor_refresh"
        ) {
            return refresh(
                interaction
            );
        }

        /* =====================================================
           VARIABLES / GUIDE
           ===================================================== */

        if (
            id === "donor_variables"
        ) {

            return interaction.update({

                components:
                    donorUI.buildVariables(),

                flags:
                    MessageFlags.IsComponentsV2
            });
        }

        /* =====================================================
           SYSTEM TOGGLE
           ===================================================== */

        if (
            id === "donor_toggle"
        ) {

            const settings =
                donorDb.getSettings(
                    interaction.guild.id
                );

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    enabled:
                        settings.enabled
                            ? 0
                            : 1
                }
            );

            return refresh(
                interaction
            );
        }

        /* =====================================================
           ANNOUNCEMENT TOGGLE
           ===================================================== */

        if (
            id === "donor_toggle_announcements"
        ) {

            const settings =
                donorDb.getSettings(
                    interaction.guild.id
                );

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    announcements_enabled:
                        settings.announcements_enabled
                            ? 0
                            : 1
                }
            );

            return refresh(
                interaction
            );
        }

        /* =====================================================
           LOGGING TOGGLE
           ===================================================== */

        if (
            id === "donor_toggle_logging"
        ) {

            const settings =
                donorDb.getSettings(
                    interaction.guild.id
                );

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    logging_enabled:
                        settings.logging_enabled
                            ? 0
                            : 1
                }
            );

            return refresh(
                interaction
            );
        }

        /* =====================================================
           KO-FI MODAL
           ===================================================== */

        if (
            id === "donor_kofi"
        ) {

            const settings =
                donorDb.getSettings(
                    interaction.guild.id
                );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        "donor_kofi_url"
                    )
                    .setLabel(
                        "Ko-fi URL"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setPlaceholder(
                        "https://ko-fi.com/yourname"
                    )
                    .setRequired(true)
                    .setValue(
                        settings.kofi_url || ""
                    );

            const row =
                new ActionRowBuilder()
                    .addComponents(input);

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        "donor_kofi_modal"
                    )
                    .setTitle(
                        "ASTER • Ko-fi URL"
                    )
                    .addComponents(row);

            return interaction.showModal(
                modal
            );
        }

        /* =====================================================
           KO-FI MODAL SUBMIT
           ===================================================== */

        if (
            id === "donor_kofi_modal"
        ) {

            const url =
                interaction.fields
                    .getTextInputValue(
                        "donor_kofi_url"
                    )
                    .trim();

            if (
                !/^https?:\/\/.+/i.test(
                    url
                )
            ) {

                return errorResponse(
                    interaction,
                    "Please enter a valid URL."
                );
            }

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    kofi_url: url
                }
            );

            return refresh(
                interaction
            );
        }

        /* =====================================================
           ANNOUNCEMENT CHANNEL
           ===================================================== */

        if (
            id === "donor_announcement_channel"
        ) {

            const settings =
                donorDb.getSettings(
                    interaction.guild.id
                );

            return interaction.update({

                components:
                    donorUI.buildChannelPicker(
                        "announcement",
                        settings.announcement_channel_id
                    ),

                flags:
                    MessageFlags.IsComponentsV2
            });
        }

        /* =====================================================
           LOG CHANNEL
           ===================================================== */

        if (
            id === "donor_log_channel"
        ) {

            const settings =
                donorDb.getSettings(
                    interaction.guild.id
                );

            return interaction.update({

                components:
                    donorUI.buildChannelPicker(
                        "logging",
                        settings.log_channel_id
                    ),

                flags:
                    MessageFlags.IsComponentsV2
            });
        }

        /* =====================================================
           ANNOUNCEMENT CHANNEL SELECT
           ===================================================== */

        if (
            id ===
            "donor_select_announcement_channel"
        ) {

            const channelId =
                interaction.values[0];

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    announcement_channel_id:
                        channelId
                }
            );

            return refresh(
                interaction
            );
        }

        /* =====================================================
           LOG CHANNEL SELECT
           ===================================================== */

        if (
            id ===
            "donor_select_log_channel"
        ) {

            const channelId =
                interaction.values[0];

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    log_channel_id:
                        channelId
                }
            );

            return refresh(
                interaction
            );
        }

        /* =====================================================
           ANNOUNCEMENT MESSAGE MODAL
           ===================================================== */

        if (
            id ===
            "donor_announcement_message"
        ) {

            const settings =
                donorDb.getSettings(
                    interaction.guild.id
                );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        "donor_announcement_text"
                    )
                    .setLabel(
                        "Announcement Message"
                    )
                    .setStyle(
                        TextInputStyle.Paragraph
                    )
                    .setPlaceholder(
                        "Thank you {user} for supporting {guild}! 💜"
                    )
                    .setRequired(true)
                    .setMaxLength(4000)
                    .setValue(
                        settings.announcement_message ||
                        "Thank you {user} for supporting {guild}! 💜"
                    );

            const row =
                new ActionRowBuilder()
                    .addComponents(input);

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        "donor_announcement_modal"
                    )
                    .setTitle(
                        "ASTER • Announcement"
                    )
                    .addComponents(row);

            return interaction.showModal(
                modal
            );
        }

        /* =====================================================
           ANNOUNCEMENT MESSAGE SUBMIT
           ===================================================== */

        if (
            id ===
            "donor_announcement_modal"
        ) {

            const message =
                interaction.fields
                    .getTextInputValue(
                        "donor_announcement_text"
                    )
                    .trim();

            if (!message) {

                return errorResponse(
                    interaction,
                    "The announcement message cannot be empty."
                );
            }

            donorDb.updateSettings(
                interaction.guild.id,
                {
                    announcement_message:
                        message
                }
            );

            return refresh(
                interaction
            );
        }

        /* =====================================================
           ADD TIER MODAL
           ===================================================== */

        if (
            id === "donor_add_tier"
        ) {

            const tierId =
                new TextInputBuilder()
                    .setCustomId(
                        "donor_tier_id"
                    )
                    .setLabel(
                        "Tier Name"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setPlaceholder(
                        "Supporter"
                    )
                    .setRequired(true)
                    .setMaxLength(50);

            const amount =
                new TextInputBuilder()
                    .setCustomId(
                        "donor_tier_amount"
                    )
                    .setLabel(
                        "Donation Amount (USD)"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setPlaceholder(
                        "5"
                    )
                    .setRequired(true)
                    .setMaxLength(10);

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        "donor_add_tier_modal"
                    )
                    .setTitle(
                        "ASTER • Add Donor Tier"
                    )
                    .addComponents(

                        new ActionRowBuilder()
                            .addComponents(
                                tierId
                            ),

                        new ActionRowBuilder()
                            .addComponents(
                                amount
                            )
                    );

            return interaction.showModal(
                modal
            );
        }

        /* =====================================================
           ADD TIER SUBMIT
           ===================================================== */

        if (
            id ===
            "donor_add_tier_modal"
        ) {

            const tierId =
                interaction.fields
                    .getTextInputValue(
                        "donor_tier_id"
                    )
                    .trim();

            const amountRaw =
                interaction.fields
                    .getTextInputValue(
                        "donor_tier_amount"
                    )
                    .trim();

            const amount =
                Number(amountRaw);

            if (!tierId) {

                return errorResponse(
                    interaction,
                    "Please enter a tier name."
                );
            }

            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                return errorResponse(
                    interaction,
                    "Donation amount must be a number greater than 0."
                );
            }

            donorDb.setTier(
                interaction.guild.id,
                tierId,
                null,
                Math.round(amount)
            );

            return interaction.update({

                components:
                    donorUI.buildTierRolePicker(
                        tierId,
                        Math.round(amount)
                    ),

                flags:
                    MessageFlags.IsComponentsV2
            });
        }

        /* =====================================================
           TIER ROLE SELECT
           ===================================================== */

        if (
            id.startsWith(
                "donor_tier_role_"
            )
        ) {

            const prefix =
                "donor_tier_role_";

            const data =
                id.slice(
                    prefix.length
                );

            const parts =
                data.split("_");

            const amount =
                Number(
                    parts.pop()
                );

            const tierId =
                parts.join("_");

            const roleId =
                interaction.values[0];

            if (
                !tierId ||
                !roleId ||
                !Number.isFinite(amount)
            ) {

                return errorResponse(
                    interaction,
                    "Invalid donor tier selection."
                );
            }

            donorDb.setTier(
                interaction.guild.id,
                tierId,
                roleId,
                amount
            );

            return refresh(
                interaction
            );
        }

        /* =====================================================
           MANAGE TIERS
           ===================================================== */

        if (
            id ===
            "donor_manage_tiers"
        ) {

            const tiers =
                donorDb.listTiers(
                    interaction.guild.id
                );

            return interaction.update({

                components:
                    donorUI.buildTierManager(
                        tiers
                    ),

                flags:
                    MessageFlags.IsComponentsV2
            });
        }

        /* =====================================================
           SELECT TIER
           ===================================================== */

        if (
            id ===
            "donor_select_tier"
        ) {

            const tierId =
                interaction.values[0];

            const tiers =
                donorDb.listTiers(
                    interaction.guild.id
                );

            const tier =
                tiers.find(
                    item =>
                        String(
                            item.tier_id
                        ) === String(tierId)
                );

            if (!tier) {

                return errorResponse(
                    interaction,
                    "That donor tier no longer exists."
                );
            }

            return interaction.update({

                components:
                    donorUI.buildSelectedTier(
                        tier
                    ),

                flags:
                    MessageFlags.IsComponentsV2
            });
        }

        /* =====================================================
           TIER TOGGLE
           ===================================================== */

        if (
            id.startsWith(
                "donor_tier_toggle_"
            )
        ) {

            const tierId =
                id.slice(
                    "donor_tier_toggle_".length
                );

            const tiers =
                donorDb.listTiers(
                    interaction.guild.id
                );

            const tier =
                tiers.find(
                    item =>
                        String(
                            item.tier_id
                        ) === String(tierId)
                );

            if (!tier) {

                return errorResponse(
                    interaction,
                    "Tier not found."
                );
            }

            donorDb.setTier(
                interaction.guild.id,
                tier.tier_id,
                tier.role_id,
                Number(tier.amount)
            );

            donorDb.updateTier?.(
                interaction.guild.id,
                tier.tier_id,
                {
                    enabled:
                        tier.enabled
                            ? 0
                            : 1
                }
            );

            return refresh(
                interaction
            );
        }

        /* =====================================================
           TIER DELETE
           ===================================================== */

        if (
            id.startsWith(
                "donor_tier_delete_"
            )
        ) {

            const tierId =
                id.slice(
                    "donor_tier_delete_".length
                );

            const tiers =
                donorDb.listTiers(
                    interaction.guild.id
                );

            const tier =
                tiers.find(
                    item =>
                        String(
                            item.tier_id
                        ) === String(tierId)
                );

            if (!tier) {

                return errorResponse(
                    interaction,
                    "Tier not found."
                );
            }

            donorDb.removeTier(
                interaction.guild.id,
                tier.tier_id
            );

            return interaction.update({

                components:
                    donorUI.buildTierManager(
                        donorDb.listTiers(
                            interaction.guild.id
                        )
                    ),

                flags:
                    MessageFlags.IsComponentsV2
            });
        }

        /* =====================================================
           VIEW CONFIG
           ===================================================== */

        if (
            id ===
            "donor_view_config"
        ) {

            const settings =
                donorDb.getSettings(
                    interaction.guild.id
                );

            const tiers =
                donorDb.listTiers(
                    interaction.guild.id
                );

            return interaction.update({

                components:
                    donorUI.buildConfigView(
                        settings,
                        tiers
                    ),

                flags:
                    MessageFlags.IsComponentsV2
            });
        }

        /* =====================================================
           RESET
           ===================================================== */

        if (
            id === "donor_reset"
        ) {

            donorDb.resetSettings(
                interaction.guild.id
            );

            return refresh(
                interaction
            );
        }

        /* =====================================================
           TEST ANNOUNCEMENT
           ===================================================== */

        if (
            id === "donor_test"
        ) {

            const settings =
                donorDb.getSettings(
                    interaction.guild.id
                );

            if (
                !settings.announcement_channel_id
            ) {

                return errorResponse(
                    interaction,
                    "No announcement channel is configured."
                );
            }

            const channel =
                interaction.guild.channels.cache.get(
                    settings.announcement_channel_id
                );

            if (!channel) {

                return errorResponse(
                    interaction,
                    "The configured announcement channel could not be found."
                );
            }

            const tiers =
                donorDb.listTiers(
                    interaction.guild.id
                );

            const firstTier =
                tiers.find(
                    tier =>
                        Number(tier.enabled) === 1
                );

            const role =
                firstTier?.role_id
                    ? interaction.guild.roles.cache.get(
                        firstTier.role_id
                    )
                    : null;

            const message =
                replaceDonorVariables(
                    settings.announcement_message ||
                    "Thank you {user} for supporting {guild}! 💜",
                    {
                        guild:
                            interaction.guild,

                        user:
                            interaction.user,

                        member:
                            interaction.member,

                        channel,

                        role,

                        tier:
                            firstTier?.tier_id ||
                            "Test Tier",

                        amount:
                            firstTier?.amount ||
                            0,

                        currency:
                            "USD",

                        settings
                    }
                );

            await channel.send({
                content:
                    `🧪 **TEST DONATION**\n\n${message}`
            });

            return interaction.reply({

                content:
                    `✅ Test announcement sent to ${channel}.`,

                flags:
                    MessageFlags.Ephemeral
            });
        }

        /* =====================================================
           UNKNOWN DONOR INTERACTION
           ===================================================== */

        return;

    } catch (error) {

        console.error(
            "DONOR CONFIG INTERACTION ERROR:",
            error
        );

        return errorResponse(
            interaction,
            "ASTER encountered an error while processing that donor configuration action."
        );
    }
};