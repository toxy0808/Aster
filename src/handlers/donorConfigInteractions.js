const {
    PermissionFlagsBits,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelSelectMenuBuilder,
    StringSelectMenuBuilder,
    ChannelType
} = require("discord.js");

const db = require("../database/database");
const donorCommand = require("../commands/donorconfig");

function admin(interaction) {
    return interaction.member?.permissions?.has(
        PermissionFlagsBits.Administrator
    );
}

function settings(guildId) {
    let row = db.prepare(`
        SELECT *
        FROM donor_settings
        WHERE guild_id = ?
    `).get(guildId);

    if (!row) {
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

        row = db.prepare(`
            SELECT *
            FROM donor_settings
            WHERE guild_id = ?
        `).get(guildId);
    }

    return row;
}

function reply(interaction, text) {
    return interaction.reply({
        content: text,
        ephemeral: true
    });
}

function channelPicker(id, placeholder) {
    return new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId(id)
            .setPlaceholder(placeholder)
            .setChannelTypes(ChannelType.GuildText)
            .setMinValues(1)
            .setMaxValues(1)
    );
}

async function handle(interaction) {
    if (!interaction.customId?.startsWith("donor_")) {
        return false;
    }

    if (!admin(interaction)) {
        await reply(interaction, "⛔ Administrator permission required.");
        return true;
    }

    const guildId = interaction.guildId;
    const id = interaction.customId;

    if (id === "donor_refresh") {
        return interaction.update({
            components: donorCommand.buildPanel(guildId)
        });
    }

    if (id === "donor_toggle") {
        const current = settings(guildId);

        db.prepare(`
            UPDATE donor_settings
            SET enabled = ?, updated_at = CURRENT_TIMESTAMP
            WHERE guild_id = ?
        `).run(
            Number(current.enabled) ? 0 : 1,
            guildId
        );

        return interaction.update({
            components: donorCommand.buildPanel(guildId)
        });
    }

    if (id === "donor_toggle_announcements") {
        const current = settings(guildId);

        db.prepare(`
            UPDATE donor_settings
            SET announcements_enabled = ?, updated_at = CURRENT_TIMESTAMP
            WHERE guild_id = ?
        `).run(
            Number(current.announcements_enabled) ? 0 : 1,
            guildId
        );

        return interaction.update({
            components: donorCommand.buildPanel(guildId)
        });
    }

    if (id === "donor_toggle_logging") {
        const current = settings(guildId);

        db.prepare(`
            UPDATE donor_settings
            SET logging_enabled = ?, updated_at = CURRENT_TIMESTAMP
            WHERE guild_id = ?
        `).run(
            Number(current.logging_enabled) ? 0 : 1,
            guildId
        );

        return interaction.update({
            components: donorCommand.buildPanel(guildId)
        });
    }

    if (id === "donor_kofi") {
        const current = settings(guildId);

        const modal = new ModalBuilder()
            .setCustomId("donor_kofi_modal")
            .setTitle("ASTER • Ko-fi URL");

        const input = new TextInputBuilder()
            .setCustomId("donor_kofi_url")
            .setLabel("Ko-fi URL")
            .setPlaceholder("https://ko-fi.com/yourname")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(300);

        if (current.provider_url) {
            input.setValue(current.provider_url);
        }

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
    }

    if (id === "donor_kofi_modal") {
        const url = interaction.fields
            .getTextInputValue("donor_kofi_url")
            .trim();

        try {
            const parsed = new URL(url);

            if (parsed.protocol !== "https:") {
                throw new Error();
            }
        } catch {
            return reply(
                interaction,
                "❌ Please enter a valid HTTPS Ko-fi URL."
            );
        }

        db.prepare(`
            UPDATE donor_settings
            SET provider_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE guild_id = ?
        `).run(url, guildId);

        return reply(interaction, "✅ Ko-fi URL updated.");
    }

    if (id === "donor_announcement_channel") {
        return interaction.reply({
            components: [
                new ContainerBuilder()
                    .setAccentColor(0x5865F2)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            "### 📢 Announcement Channel\nSelect where ASTER should announce donations."
                        )
                    ),
                channelPicker(
                    "donor_announcement_channel_select",
                    "Select announcement channel"
                )
            ],
            flags:
                MessageFlags.IsComponentsV2 |
                MessageFlags.Ephemeral
        });
    }

    if (id === "donor_announcement_channel_select") {
        const channelId = interaction.values[0];

        db.prepare(`
            UPDATE donor_settings
            SET announcement_channel_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE guild_id = ?
        `).run(channelId, guildId);

        return reply(
            interaction,
            `✅ Announcement channel set to <#${channelId}>.`
        );
    }

    if (id === "donor_log_channel") {
        return interaction.reply({
            components: [
                new ContainerBuilder()
                    .setAccentColor(0x5865F2)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            "### 📝 Logging Channel\nSelect where ASTER should log donor events."
                        )
                    ),
                channelPicker(
                    "donor_log_channel_select",
                    "Select logging channel"
                )
            ],
            flags:
                MessageFlags.IsComponentsV2 |
                MessageFlags.Ephemeral
        });
    }

    if (id === "donor_log_channel_select") {
        const channelId = interaction.values[0];

        db.prepare(`
            UPDATE donor_settings
            SET log_channel_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE guild_id = ?
        `).run(channelId, guildId);

        return reply(
            interaction,
            `✅ Logging channel set to <#${channelId}>.`
        );
    }

    if (id === "donor_message") {
        const current = settings(guildId);

        const modal = new ModalBuilder()
            .setCustomId("donor_message_modal")
            .setTitle("ASTER • Announcement Message");

        const input = new TextInputBuilder()
            .setCustomId("donor_announcement_message")
            .setLabel("Donation announcement")
            .setPlaceholder("{donor}, {amount}, {tier}")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);

        if (current.announcement_message) {
            input.setValue(current.announcement_message);
        }

        modal.addComponents(
            new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
    }

    if (id === "donor_message_modal") {
        const message = interaction.fields
            .getTextInputValue("donor_announcement_message")
            .trim();

        if (!message.length) {
            return reply(interaction, "❌ Message cannot be empty.");
        }

        db.prepare(`
            UPDATE donor_settings
            SET announcement_message = ?, updated_at = CURRENT_TIMESTAMP
            WHERE guild_id = ?
        `).run(message, guildId);

        return reply(interaction, "✅ Announcement message updated.");
    }

    if (id === "donor_add_tier") {
        const modal = new ModalBuilder()
            .setCustomId("donor_add_tier_modal")
            .setTitle("ASTER • Add Donor Tier");

        const tier = new TextInputBuilder()
            .setCustomId("donor_tier_id")
            .setLabel("Tier ID")
            .setPlaceholder("gold")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(30);

        const amount = new TextInputBuilder()
            .setCustomId("donor_tier_amount")
            .setLabel("Amount in USD")
            .setPlaceholder("5")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(6);

        modal.addComponents(
            new ActionRowBuilder().addComponents(tier),
            new ActionRowBuilder().addComponents(amount)
        );

        return interaction.showModal(modal);
    }

    if (id === "donor_add_tier_modal") {
        const tierId = interaction.fields
            .getTextInputValue("donor_tier_id")
            .trim()
            .toLowerCase();

        const amount = Number(
            interaction.fields
                .getTextInputValue("donor_tier_amount")
                .trim()
        );

        if (!/^[a-z0-9_-]{1,30}$/.test(tierId)) {
            return reply(
                interaction,
                "❌ Tier ID may only contain letters, numbers, `_` and `-`."
            );
        }

        if (!Number.isInteger(amount) || amount <= 0) {
            return reply(
                interaction,
                "❌ Amount must be a whole USD amount."
            );
        }

        const existing = db.prepare(`
            SELECT tier_id
            FROM donor_tiers
            WHERE guild_id = ? AND tier_id = ?
        `).get(guildId, tierId);

        if (existing) {
            return reply(
                interaction,
                `❌ Tier \`${tierId}\` already exists.`
            );
        }

        const roleRow = await interaction.reply({
            components: [
                new ContainerBuilder()
                    .setAccentColor(0x5865F2)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### 🏆 ${tierId}\nSelect the Discord role for **$${amount}** donations.`
                        )
                    ),
                new ActionRowBuilder().addComponents(
                    new (require("discord.js").RoleSelectMenuBuilder)()
                        .setCustomId(`donor_tier_role_${tierId}_${amount}`)
                        .setPlaceholder("Select donor role")
                        .setMinValues(1)
                        .setMaxValues(1)
                )
            ],
            flags:
                MessageFlags.IsComponentsV2 |
                MessageFlags.Ephemeral
        });

        return roleRow;
    }

    if (id.startsWith("donor_tier_role_")) {
        const parts = id.split("_");
        const amount = Number(parts.pop());
        const tierId = parts.slice(3).join("_");

        const roleId = interaction.values[0];

        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
            return reply(interaction, "❌ That role no longer exists.");
        }

        const existing = db.prepare(`
            SELECT tier_id
            FROM donor_tiers
            WHERE guild_id = ? AND tier_id = ?
        `).get(guildId, tierId);

        if (existing) {
            return reply(interaction, `❌ Tier \`${tierId}\` already exists.`);
        }

        db.prepare(`
            INSERT INTO donor_tiers (
                guild_id,
                tier_id,
                role_id,
                amount,
                enabled
            )
            VALUES (?, ?, ?, ?, 1)
        `).run(
            guildId,
            tierId,
            roleId,
            amount
        );

        return reply(
            interaction,
            `✅ Donor tier **${tierId}** created.\n` +
            `Role: <@&${roleId}>\n` +
            `Amount: **$${amount}**`
        );
    }

    if (id === "donor_manage_tiers") {
        const tiers = db.prepare(`
            SELECT tier_id, role_id, amount, enabled
            FROM donor_tiers
            WHERE guild_id = ?
            ORDER BY amount ASC
        `).all(guildId);

        if (!tiers.length) {
            return reply(interaction, "ℹ️ No donor tiers configured.");
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId("donor_tier_manage_select")
            .setPlaceholder("Select a tier")
            .addOptions(
                tiers.slice(0, 25).map(t => ({
                    label: t.tier_id.slice(0, 100),
                    description: `$${Number(t.amount).toFixed(0)} • ${t.enabled ? "Enabled" : "Disabled"}`,
                    value: t.tier_id
                }))
            );

        return interaction.reply({
            components: [
                new ContainerBuilder()
                    .setAccentColor(0x5865F2)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            "### 🏆 Manage Donor Tiers\nSelect a tier below."
                        )
                    ),
                new ActionRowBuilder().addComponents(menu)
            ],
            flags:
                MessageFlags.IsComponentsV2 |
                MessageFlags.Ephemeral
        });
    }

    if (id === "donor_tier_manage_select") {
        const tierId = interaction.values[0];

        const tier = db.prepare(`
            SELECT *
            FROM donor_tiers
            WHERE guild_id = ? AND tier_id = ?
        `).get(guildId, tierId);

        if (!tier) {
            return reply(interaction, "❌ Tier not found.");
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`donor_tier_toggle_${tierId}`)
                .setLabel(tier.enabled ? "Disable" : "Enable")
                .setStyle(
                    tier.enabled
                        ? ButtonStyle.Secondary
                        : ButtonStyle.Success
                ),

            new ButtonBuilder()
                .setCustomId(`donor_tier_delete_${tierId}`)
                .setLabel("Delete")
                .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
            components: [
                new ContainerBuilder()
                    .setAccentColor(0x5865F2)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### 🏆 ${tier.tier_id}\n` +
                            `Role: <@&${tier.role_id}>\n` +
                            `Amount: **$${Number(tier.amount).toFixed(0)}**\n` +
                            `Status: **${tier.enabled ? "Enabled" : "Disabled"}**`
                        )
                    ),
                row
            ],
            flags:
                MessageFlags.IsComponentsV2 |
                MessageFlags.Ephemeral
        });
    }

    if (id.startsWith("donor_tier_toggle_")) {
        const tierId = id.slice("donor_tier_toggle_".length);

        const tier = db.prepare(`
            SELECT enabled
            FROM donor_tiers
            WHERE guild_id = ? AND tier_id = ?
        `).get(guildId, tierId);

        if (!tier) {
            return reply(interaction, "❌ Tier not found.");
        }

        db.prepare(`
            UPDATE donor_tiers
            SET enabled = ?
            WHERE guild_id = ? AND tier_id = ?
        `).run(
            Number(tier.enabled) ? 0 : 1,
            guildId,
            tierId
        );

        return reply(
            interaction,
            `✅ Tier \`${tierId}\` updated.`
        );
    }

    if (id.startsWith("donor_tier_delete_")) {
        const tierId = id.slice("donor_tier_delete_".length);

        db.prepare(`
            DELETE FROM donor_tiers
            WHERE guild_id = ? AND tier_id = ?
        `).run(guildId, tierId);

        return reply(
            interaction,
            `🗑️ Tier \`${tierId}\` deleted.`
        );
    }

    if (id === "donor_view") {
        const s = settings(guildId);

        return interaction.reply({
            components: [
                new ContainerBuilder()
                    .setAccentColor(0x5865F2)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            "### ✦ ASTER • Donor Configuration\n\n" +
                            `**System:** ${Number(s.enabled) ? "Enabled" : "Disabled"}\n` +
                            `**Ko-fi:** ${s.provider_url || "Not configured"}\n` +
                            `**Announcements:** ${Number(s.announcements_enabled) ? "On" : "Off"}\n` +
                            `**Announcement channel:** ${s.announcement_channel_id ? `<#${s.announcement_channel_id}>` : "Not set"}\n` +
                            `**Logging:** ${Number(s.logging_enabled) ? "On" : "Off"}\n` +
                            `**Log channel:** ${s.log_channel_id ? `<#${s.log_channel_id}>` : "Not set"}\n\n` +
                            `**Message:**\n${s.announcement_message || "Not configured"}`
                        )
                    )
            ],
            flags:
                MessageFlags.IsComponentsV2 |
                MessageFlags.Ephemeral
        });
    }

    if (id === "donor_reset") {
        db.prepare(`
            DELETE FROM donor_settings
            WHERE guild_id = ?
        `).run(guildId);

        settings(guildId);

        return interaction.update({
            components: donorCommand.buildPanel(guildId)
        });
    }

    if (id === "donor_test") {
        const s = settings(guildId);

        if (!s.announcement_channel_id) {
            return reply(
                interaction,
                "❌ Configure an announcement channel first."
            );
        }

        const channel =
            interaction.guild.channels.cache.get(
                s.announcement_channel_id
            );

        if (!channel?.isTextBased()) {
            return reply(
                interaction,
                "❌ The configured announcement channel is unavailable."
            );
        }

        const message = (s.announcement_message ||
            "☕ **{donor}** just supported **{amount}** — thank you for helping keep ASTER running!")
            .replaceAll("{donor}", interaction.user.toString())
            .replaceAll("{amount}", "$5")
            .replaceAll("{tier}", "Test");

        await channel.send({
            content: message
        });

        return reply(interaction, "✅ Test announcement sent.");
    }

    return false;
}

module.exports = handle;