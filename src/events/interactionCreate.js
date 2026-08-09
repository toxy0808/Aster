const {
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const db = require("../database/database");

module.exports = async (interaction) => {

    // =========================
    // SUPPORTED INTERACTIONS
    // =========================

    if (
        !interaction.isButton() &&
        !interaction.isChannelSelectMenu() &&
        !interaction.isRoleSelectMenu() &&
        !interaction.isModalSubmit()
    ) {
        return;
    }

    console.log(
        "TYPE:",
        interaction.customId,
        "VALUES:",
        interaction.values
    );

    console.log(
        "ANY INTERACTION:",
        interaction.type,
        interaction.customId
    );

    // =========================
    // LEADERBOARD CONFIG
    // =========================

    if (interaction.customId === "config_leaderboard") {

        const menu = new ActionRowBuilder()
            .addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId("set_leaderboard_channel")
                    .setPlaceholder(
                        "Select leaderboard channel"
                    )
            );

        return interaction.reply({
            content:
                "🏆 **Leaderboard Configuration**\n\n" +
                "Select the channel where ASTER should display the live leaderboard.",
            components: [menu],
            ephemeral: true
        });
    }

    // =========================
    // SAVE LEADERBOARD CHANNEL
    // =========================

    if (interaction.customId === "set_leaderboard_channel") {

        const channelId = interaction.values[0];

        db.prepare(`
            UPDATE server_config
            SET leaderboard_channel = ?
            WHERE guild_id = ?
        `).run(
            channelId,
            interaction.guild.id
        );

        return interaction.update({
            content:
                `✅ Leaderboard channel set to <#${channelId}>`,
            components: []
        });
    }

    // =========================
    // ACTIVITY ROLES
    // =========================

    if (interaction.customId === "config_roles") {

        const chatMenu = new ActionRowBuilder()
            .addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId("set_chat_role")
                    .setPlaceholder("Select Chat King role")
                    .setMinValues(1)
                    .setMaxValues(1)
            );

        const voiceMenu = new ActionRowBuilder()
            .addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId("set_voice_role")
                    .setPlaceholder("Select Voice King role")
                    .setMinValues(1)
                    .setMaxValues(1)
            );

        return interaction.reply({
            content:
                "👑 **Activity Roles**\n\n" +
                "Select the roles ASTER should use for activity winners.",
            components: [
                chatMenu,
                voiceMenu
            ],
            ephemeral: true
        });
    }

    // =========================
    // SAVE CHAT ROLE
    // =========================

    if (interaction.customId === "set_chat_role") {

        db.prepare(`
            UPDATE server_config
            SET chat_king_role = ?
            WHERE guild_id = ?
        `).run(
            interaction.values[0],
            interaction.guild.id
        );

        return interaction.update({
            content: "✅ Chat King role saved!",
            components: []
        });
    }

    // =========================
    // SAVE VOICE ROLE
    // =========================

    if (interaction.customId === "set_voice_role") {

        db.prepare(`
            UPDATE server_config
            SET voice_king_role = ?
            WHERE guild_id = ?
        `).run(
            interaction.values[0],
            interaction.guild.id
        );

        return interaction.update({
            content: "✅ Voice King role saved!",
            components: []
        });
    }

    // =========================
    // REP CONFIG
    // =========================

    if (interaction.customId === "config_rep") {

        const staffRole = new ActionRowBuilder()
            .addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId("set_rep_staff_role")
                    .setPlaceholder("Select Staff role")
                    .setMinValues(1)
                    .setMaxValues(1)
            );

        const funderRole = new ActionRowBuilder()
            .addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId("set_rep_funder_role")
                    .setPlaceholder("Select Funder role")
                    .setMinValues(1)
                    .setMaxValues(1)
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("rep_limits")
                    .setLabel("⚙️ Rep Limits")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("rep_rewards")
                    .setLabel("🏅 Rep Rewards")
                    .setStyle(ButtonStyle.Secondary)
            );

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4DA6)

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "# ✨ ASTER • Reputation\n" +
                    "Configure the server reputation system."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 🎯 Daily Limits\n" +
                    "👤 Member — **3/day**\n" +
                    "🛡️ Staff — **5/day**\n" +
                    "💎 Funder — **8/day**\n" +
                    "🛡️💎 Staff + Funder — **10/day**"
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "Select the Staff and Funder roles below."
                )
            );

        return interaction.reply({
            components: [
                container,
                staffRole,
                funderRole,
                buttons
            ],
            flags:
                MessageFlags.IsComponentsV2 |
                MessageFlags.Ephemeral
        });
    }

    // =========================
    // SAVE REP STAFF ROLE
    // =========================

    if (interaction.customId === "set_rep_staff_role") {

        const roleId = interaction.values[0];

        db.prepare(`
            UPDATE server_config
            SET rep_staff_role = ?
            WHERE guild_id = ?
        `).run(
            roleId,
            interaction.guild.id
        );

        return interaction.update({
            content:
                `✅ Rep Staff role set to <@&${roleId}>`,
            components: []
        });
    }

    // =========================
    // SAVE REP FUNDER ROLE
    // =========================

    if (interaction.customId === "set_rep_funder_role") {

        const roleId = interaction.values[0];

        db.prepare(`
            UPDATE server_config
            SET rep_funder_role = ?
            WHERE guild_id = ?
        `).run(
            roleId,
            interaction.guild.id
        );

        return interaction.update({
            content:
                `✅ Rep Funder role set to <@&${roleId}>`,
            components: []
        });
    }

    // =========================
    // OPEN REP LIMIT MODAL
    // =========================

    if (interaction.customId === "rep_limits") {

        const config = db.prepare(`
            SELECT
                rep_member_limit,
                rep_staff_limit,
                rep_funder_limit,
                rep_staff_funder_limit
            FROM server_config
            WHERE guild_id = ?
        `).get(interaction.guild.id);

        const modal = new ModalBuilder()
            .setCustomId("rep_limits_modal")
            .setTitle("ASTER • Rep Limits");

        const memberInput = new TextInputBuilder()
            .setCustomId("rep_member_limit")
            .setLabel("Member daily limit")
            .setStyle(TextInputStyle.Short)
            .setValue(
                String(config?.rep_member_limit ?? 3)
            )
            .setRequired(true);

        const staffInput = new TextInputBuilder()
            .setCustomId("rep_staff_limit")
            .setLabel("Staff daily limit")
            .setStyle(TextInputStyle.Short)
            .setValue(
                String(config?.rep_staff_limit ?? 5)
            )
            .setRequired(true);

        const funderInput = new TextInputBuilder()
            .setCustomId("rep_funder_limit")
            .setLabel("Funder daily limit")
            .setStyle(TextInputStyle.Short)
            .setValue(
                String(config?.rep_funder_limit ?? 8)
            )
            .setRequired(true);

        const combinedInput = new TextInputBuilder()
            .setCustomId("rep_staff_funder_limit")
            .setLabel("Staff + Funder daily limit")
            .setStyle(TextInputStyle.Short)
            .setValue(
                String(config?.rep_staff_funder_limit ?? 10)
            )
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder()
                .addComponents(memberInput),

            new ActionRowBuilder()
                .addComponents(staffInput),

            new ActionRowBuilder()
                .addComponents(funderInput),

            new ActionRowBuilder()
                .addComponents(combinedInput)
        );

        return interaction.showModal(modal);
    }

    // =========================
    // SAVE REP LIMITS
    // =========================

    if (interaction.customId === "rep_limits_modal") {

        const memberLimit = parseInt(
            interaction.fields.getTextInputValue(
                "rep_member_limit"
            )
        );

        const staffLimit = parseInt(
            interaction.fields.getTextInputValue(
                "rep_staff_limit"
            )
        );

        const funderLimit = parseInt(
            interaction.fields.getTextInputValue(
                "rep_funder_limit"
            )
        );

        const combinedLimit = parseInt(
            interaction.fields.getTextInputValue(
                "rep_staff_funder_limit"
            )
        );

        const limits = [
            memberLimit,
            staffLimit,
            funderLimit,
            combinedLimit
        ];

        if (
            limits.some(
                limit =>
                    !Number.isInteger(limit) ||
                    limit < 0 ||
                    limit > 100
            )
        ) {
            return interaction.reply({
                content:
                    "❌ All limits must be whole numbers between **0 and 100**.",
                ephemeral: true
            });
        }

        db.prepare(`
            UPDATE server_config
            SET
                rep_member_limit = ?,
                rep_staff_limit = ?,
                rep_funder_limit = ?,
                rep_staff_funder_limit = ?
            WHERE guild_id = ?
        `).run(
            memberLimit,
            staffLimit,
            funderLimit,
            combinedLimit,
            interaction.guild.id
        );

        return interaction.reply({
            content:
                "✅ **Rep limits updated!**\n\n" +
                `👤 Member: **${memberLimit}/day**\n` +
                `🛡️ Staff: **${staffLimit}/day**\n` +
                `💎 Funder: **${funderLimit}/day**\n` +
                `🛡️💎 Staff + Funder: **${combinedLimit}/day**`,
            ephemeral: true
        });
    }

    // =========================
    // REP REWARDS
    // =========================

    if (interaction.customId === "rep_rewards") {

        return interaction.reply({
            content:
                "🏅 **Rep Rewards**\n\n" +
                "Rep reward roles will be configured here next.",
            ephemeral: true
        });
    }
};