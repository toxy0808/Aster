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
const asterLogger = require("../utils/asterLogger");
const symbols = require("../utils/asterUI/symbols");

const {
    createCommandMessage
} = require("../utils/commandMessageAdapter");

const {
    getGuild,
    add,
    remove,
    clear,
    MAX_AUTORESPONDERS_PER_GUILD
} = require("../utils/autoresponder");

function ensureServerConfig(guildId) {
    db.prepare(`
        INSERT OR IGNORE INTO server_config (guild_id)
        VALUES (?)
    `).run(String(guildId));
}


// ========================================================
// AUTORESPONDER HELPERS
// ========================================================

const AUTORESPONDERS_PER_PAGE = 4;

function isAdministrator(interaction) {
    return interaction.memberPermissions?.has("Administrator");
}

function getAutoresponderEntries(guildId) {
    return [...getGuild(guildId).entries()];
}

function buildAutoresponderManager(guildId, page = 0) {
    const entries = getAutoresponderEntries(guildId);

    const totalPages = Math.max(
        1,
        Math.ceil(entries.length / AUTORESPONDERS_PER_PAGE)
    );

    const safePage = Math.min(
        Math.max(Number(page) || 0, 0),
        totalPages - 1
    );

    const start = safePage * AUTORESPONDERS_PER_PAGE;

    const pageEntries = entries.slice(
        start,
        start + AUTORESPONDERS_PER_PAGE
    );

    const container = new ContainerBuilder()
        .setAccentColor(0xFF4DA6)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${symbols.brand} ASTER / AUTORESPONDER\n` +
                `-# Manage automatic responses for this server.\n\n` +
                `### ${symbols.autoresponder} Configured Responses\n` +
                `**${entries.length} / ${MAX_AUTORESPONDERS_PER_GUILD}** autoresponders configured.`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
        );

    if (!pageEntries.length) {

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### No Autoresponders\n\n` +
                `You haven't configured any autoresponders yet.\n\n` +
                `-# Use **＋ Add** below to create one.`
            )
        );

    } else {

        const list = pageEntries
            .map(([trigger, response], index) => {

                const number = start + index + 1;
                const type = response?.type || "text";

                const preview = String(
                    response?.content ?? ""
                )
                    .replace(/\s+/g, " ")
                    .slice(0, 120);

                return (
                    `### ${number}. \`${trigger}\`\n` +
                    `Type: **${type}**\n` +
                    `${preview || "No response content."}`
                );
            })
            .join("\n\n");

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(list)
        );
    }

    container.addSeparatorComponents(
        new SeparatorBuilder()
    );

    const manageRow = new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()
                .setCustomId("autoresponder_add")
                .setLabel("＋ Add")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("autoresponder_list")
                .setLabel("View")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("autoresponder_clear")
                .setLabel("Clear All")
                .setStyle(ButtonStyle.Danger)
        );

    const components = [
        container,
        manageRow
    ];

    for (let i = 0; i < pageEntries.length; i++) {

        const [trigger] = pageEntries[i];

        components.push(
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            `autoresponder_delete_${safePage}_${i}`
                        )
                        .setLabel(
                            `Delete: ${trigger.slice(0, 75)}`
                        )
                        .setStyle(ButtonStyle.Danger)
                )
        );
    }

    if (totalPages > 1) {

        const navigation = new ActionRowBuilder();

        navigation.addComponents(

            new ButtonBuilder()
                .setCustomId(
                    `autoresponder_page_${safePage - 1}`
                )
                .setLabel("← Previous")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(safePage === 0),

            new ButtonBuilder()
                .setCustomId(
                    `autoresponder_page_${safePage + 1}`
                )
                .setLabel("Next →")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(
                    safePage >= totalPages - 1
                )
        );

        components.push(navigation);
    }

    return components;
}

function getAutoresponderFromPage(
    guildId,
    page,
    index
) {

    const entries = getAutoresponderEntries(guildId);

    const numericPage = Number(page);
    const numericIndex = Number(index);

    if (
        !Number.isInteger(numericPage) ||
        !Number.isInteger(numericIndex) ||
        numericPage < 0 ||
        numericIndex < 0
    ) {
        return null;
    }

    const start =
        numericPage * AUTORESPONDERS_PER_PAGE;

    return entries[start + numericIndex] || null;
}

function autoresponderConfirmation(
    title,
    description
) {

    return new ContainerBuilder()
        .setAccentColor(0xFF4DA6)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${symbols.brand} ASTER / AUTORESPONDER\n` +
                `### ${title}\n` +
                `-# ${description}`
            )
        );
}


// ========================================================
// REP DAILY LIMIT HELPERS
// ========================================================

const DEFAULT_REP_BASE_LIMIT = 3;
const MAX_REP_LIMIT = 100;

function getRepBaseLimit(guildId) {
    ensureServerConfig(guildId);

    const config = db.prepare(`
        SELECT rep_member_limit
        FROM server_config
        WHERE guild_id = ?
    `).get(String(guildId));

    const base = Number(config?.rep_member_limit);

    if (
        !Number.isInteger(base) ||
        base < 0
    ) {
        return DEFAULT_REP_BASE_LIMIT;
    }

    return base;
}

function getRepRoleBonuses(guildId) {
    return db.prepare(`
        SELECT
            role_id,
            bonus
        FROM rep_role_limits
        WHERE guild_id = ?
        ORDER BY bonus DESC, role_id ASC
    `).all(String(guildId));
}

function parseRepLimit(value) {
    const input = String(value ?? "").trim();

    if (!/^\d+$/.test(input)) {
        return null;
    }

    const number = Number(input);

    if (
        !Number.isSafeInteger(number) ||
        number < 0 ||
        number > MAX_REP_LIMIT
    ) {
        return null;
    }

    return number;
}


/*
 * FIXED:
 *
 * This function receives the Discord Guild object.
 * Previously it was named guildId but interaction.guild
 * was being passed into it, causing SQLite to receive a
 * Guild object instead of a string.
 */
function buildRepLimitsManager(guild) {

    if (!guild?.id) {
        throw new Error(
            "buildRepLimitsManager requires a Discord Guild."
        );
    }

    const guildId = String(guild.id);

    ensureServerConfig(guildId);

    const baseLimit =
        getRepBaseLimit(guildId);

    const bonuses =
        getRepRoleBonuses(guildId);

    let bonusText;

    if (!bonuses.length) {

        bonusText =
            "No role bonuses configured yet.\n\n" +
            "-# Add a Discord role below to give members an additional daily reputation allowance.";

    } else {

        const lines = bonuses.map((entry, index) => {

            const role =
                guild.roles.cache.get(
                    String(entry.role_id)
                );

            const roleName =
                role
                    ? `<@&${entry.role_id}>`
                    : `Unknown / Deleted Role \`${entry.role_id}\``;

            const bonus =
                Number.isInteger(Number(entry.bonus))
                    ? Math.max(0, Number(entry.bonus))
                    : 0;

            return (
                `${index + 1}. ${roleName} → **+${bonus}/day**`
            );
        });

        bonusText = lines.join("\n");

        if (bonusText.length > 3500) {
            bonusText =
                bonusText.slice(0, 3450) +
                "\n\n-# Some entries are not shown because the list is too long.";
        }
    }

    const container =
        new ContainerBuilder()
            .setAccentColor(0xFF006E)

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        "# ✨ ASTER • Reputation Daily Limits\n" +
                        "-# Configure the base allowance and stackable role bonuses."
                    )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `### 🎯 Base Daily Limit\n\n` +
                        `Every member starts with **${baseLimit}/day**.\n\n` +
                        `Use **Set Base Limit** to change this value.`
                    )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `### 🏷️ Role Bonuses\n\n` +
                        `**${bonuses.length}** role bonus${bonuses.length === 1 ? "" : "es"} configured.\n\n` +
                        bonusText
                    )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        "### 💡 How Stacking Works\n\n" +
                        "A member's daily limit is calculated from their **current Discord roles** every time they use `,rep`.\n\n" +
                        "**Base limit + every matching role bonus = current limit**\n\n" +
                        "Role bonuses stack together. Losing a role immediately removes its bonus."
                    )
            );

    const buttons =
    new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("rep_limits_set_base")
                .setLabel("Set Base Limit")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("rep_limits_add_role")
                .setLabel("＋ Add Role Bonus")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("rep_limits_edit_role")
                .setLabel("Edit Role Bonus")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("rep_limits_remove_role")
                .setLabel("Remove Role Bonus")
                .setStyle(ButtonStyle.Danger)
        );

const viewButtons =
    new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("rep_limits_view_roles")
                .setLabel("📋 View Role Bonuses")
                .setStyle(ButtonStyle.Secondary)
        );

    const backRow =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "config_rep"
                    )
                    .setLabel(
                        "← Back to Reputation"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    return [
        container,
        buttons,
        viewButtons,
        backRow
    ];
}

function getRepRoleBonus(guildId, roleId) {
    return db.prepare(`
        SELECT
            guild_id,
            role_id,
            bonus
        FROM rep_role_limits
        WHERE guild_id = ?
          AND role_id = ?
    `).get(
        String(guildId),
        String(roleId)
    );
}


// ========================================================
// MAIN INTERACTION HANDLER
// ========================================================

module.exports = async (interaction) => {

    try {

        if (!interaction.guild) {
            return;
        }


        // ========================================================
        // SLASH COMMANDS
        // ========================================================

        if (interaction.isChatInputCommand()) {

            const command =
                interaction.client.commands.get(
                    interaction.commandName
                );

            if (!command) {

                console.error(
                    `ASTER: Slash command not found: /${interaction.commandName}`
                );

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {
                    await interaction.reply({
                        content:
                            "❌ ASTER could not find that command.",
                        ephemeral: true
                    }).catch(console.error);
                }

                return;
            }

            try {

                console.log(
                    `ASTER: Executing slash command /${interaction.commandName}`
                );

                const message =
                    createCommandMessage(
                        interaction
                    );

                await command.execute(
                    message,
                    []
                );

                console.log(
                    `ASTER: Finished slash command /${interaction.commandName}`
                );

            } catch (error) {

                console.error(
                    `ASTER: Slash command /${interaction.commandName} failed:`,
                    error
                );

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {

                    await interaction.reply({
                        content:
                            "❌ ASTER encountered an error while executing that command.",
                        ephemeral: true
                    }).catch(replyError => {
                        console.error(
                            "ASTER: Failed to send slash command error response:",
                            replyError
                        );
                    });
                }
            }

            return;
        }


        // ========================================================
        // LEADERBOARD CONFIG
        // ========================================================

        if (interaction.customId === "config_leaderboard") {

            const menu = new ActionRowBuilder()
                .addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId(
                            "set_leaderboard_channel"
                        )
                        .setPlaceholder(
                            "Select leaderboard channel"
                        )
                );

            return interaction.reply({
                content:
                    "🏆 **Leaderboard Configuration**\n\n" +
                    "Select the channel where ASTER should display the live leaderboards.",
                components: [menu],
                ephemeral: true
            });
        }


        // ========================================================
        // ASTER LOGGING CONFIGURATION
        // ========================================================

        if (interaction.customId === "config_logging") {

            ensureServerConfig(
                interaction.guild.id
            );

            const config = db.prepare(`
                SELECT log_channel
                FROM server_config
                WHERE guild_id = ?
            `).get(
                interaction.guild.id
            );

            const channelMenu =
                new ActionRowBuilder()
                    .addComponents(

                        new ChannelSelectMenuBuilder()
                            .setCustomId(
                                "set_log_channel"
                            )
                            .setPlaceholder(
                                config?.log_channel
                                    ? "Change ASTER log channel"
                                    : "Select ASTER log channel"
                            )
                            .setMinValues(1)
                            .setMaxValues(1)
                    );

            const buttons =
                new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                "remove_log_channel"
                            )
                            .setLabel(
                                "Remove Logging"
                            )
                            .setStyle(
                                ButtonStyle.Danger
                            )
                    );

            const status =
                config?.log_channel
                    ? `<#${config.log_channel}>`
                    : "Not configured";

            const container =
                new ContainerBuilder()
                    .setAccentColor(0xFF4DA6)

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `# ✦ ASTER / LOGGING\n` +
                                `-# Centralized audit and system logging.\n\n` +
                                `### ◇ Log Channel\n` +
                                `ASTER will send important system and configuration ` +
                                `events to the selected channel.\n\n` +
                                `**Current:** ${status}`
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `### ⌘ Logged Systems\n\n` +
                                `◈ Configuration changes\n` +
                                `↪ Autoresponder actions\n` +
                                `✧ Autoreact actions\n` +
                                `✚ Reputation actions\n` +
                                `♛ Leaderboard events\n` +
                                `✕ Important errors\n` +
                                `✦ ASTER system events`
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `-# ◷ Logging only records important ASTER events.\n` +
                                `-# ✦ Normal messages and routine activity are not logged.`
                            )
                    );

            return interaction.reply({
                components: [
                    container,
                    channelMenu,
                    buttons
                ],
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });
        }


        // ========================================================
        // SAVE ASTER LOG CHANNEL
        // ========================================================

        if (interaction.customId === "set_log_channel") {

            ensureServerConfig(
                interaction.guild.id
            );

            const channelId =
                interaction.values[0];

            db.prepare(`
                UPDATE server_config
                SET log_channel = ?
                WHERE guild_id = ?
            `).run(
                channelId,
                interaction.guild.id
            );

            const confirmation =
                new ContainerBuilder()
                    .setAccentColor(0xFF4DA6)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `# ✦ ASTER / LOGGING\n` +
                                `-# Logging configuration updated.\n\n` +
                                `### ◇ Log Channel\n` +
                                `<#${channelId}>\n\n` +
                                `-# ✦ ASTER audit logging is now active.`
                            )
                    );

            await interaction.update({
                components: [
                    confirmation
                ],
                flags:
                    MessageFlags.IsComponentsV2
            });

            asterLogger.config(
                interaction.guild.id,
                "Logging Channel Updated",
                `ASTER logging has been configured for <#${channelId}>.`,
                interaction.user,
                {
                    "Channel":
                        `<#${channelId}>`,
                    "Channel ID":
                        channelId
                }
            ).catch(console.error);

            return;
        }


        // ========================================================
        // REMOVE ASTER LOGGING
        // ========================================================

        if (
            interaction.customId ===
            "remove_log_channel"
        ) {

            ensureServerConfig(
                interaction.guild.id
            );

            db.prepare(`
                UPDATE server_config
                SET log_channel = NULL
                WHERE guild_id = ?
            `).run(
                interaction.guild.id
            );

            const container =
                new ContainerBuilder()
                    .setAccentColor(0xFF4DA6)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `# ✦ ASTER / LOGGING\n` +
                                `### Logging Disabled\n` +
                                `-# ASTER will no longer send audit logs to a channel.`
                            )
                    );

            return interaction.update({
                components: [
                    container
                ],
                flags:
                    MessageFlags.IsComponentsV2
            });
        }


        // ========================================================
        // ASTER AUTOMATION CONFIGURATION
        // ========================================================

        if (
            interaction.customId ===
            "config_automation"
        ) {

            const container =
                new ContainerBuilder()
                    .setAccentColor(0xFF4DA6)

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `# ${symbols.brand} ASTER / AUTOMATION\n` +
                                `-# Manage ASTER's automated systems.`
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `### ${symbols.automation} Automation Systems\n\n` +
                                `${symbols.autoresponder} **Autoresponder**\n` +
                                `Automatically responds to configured triggers.\n\n` +
                                `${symbols.autoreact} **Autoreact**\n` +
                                `Automatically reacts to configured users.`
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `### ${symbols.settings} Management\n\n` +
                                `Use the buttons below to manage ASTER automation systems.\n\n` +
                                `-# ${symbols.time} Automation actions are recorded by ASTER Logging.`
                            )
                    );

            const row =
                new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                "automation_autoresponder"
                            )
                            .setLabel(
                                "Autoresponder"
                            )
                            .setStyle(
                                ButtonStyle.Primary
                            ),

                        new ButtonBuilder()
                            .setCustomId(
                                "automation_autoreact"
                            )
                            .setLabel(
                                "Autoreact"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            )
                    );

            return interaction.reply({
                components: [
                    container,
                    row
                ],
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });
        }


        // ========================================================
        // AUTORESPONDER MANAGER
        // ========================================================

        if (
            interaction.customId ===
            "automation_autoresponder"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage autoresponders.",
                    ephemeral: true
                });
            }

            return interaction.reply({
                components:
                    buildAutoresponderManager(
                        interaction.guild.id,
                        0
                    ),
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });
        }


        // ========================================================
        // AUTORESPONDER ADD BUTTON
        // ========================================================

        if (
            interaction.customId ===
            "autoresponder_add"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage autoresponders.",
                    ephemeral: true
                });
            }

            const guildEntries =
                getAutoresponderEntries(
                    interaction.guild.id
                );

            if (
                guildEntries.length >=
                MAX_AUTORESPONDERS_PER_GUILD
            ) {
                return interaction.reply({
                    content:
                        `❌ This server already has the maximum of **${MAX_AUTORESPONDERS_PER_GUILD}** autoresponders.`,
                    ephemeral: true
                });
            }

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        "autoresponder_add_modal"
                    )
                    .setTitle(
                        "ASTER • Add Autoresponder"
                    );

            const triggerInput =
                new TextInputBuilder()
                    .setCustomId(
                        "autoresponder_trigger"
                    )
                    .setLabel(
                        "Trigger"
                    )
                    .setPlaceholder(
                        "Example: hello"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setMaxLength(100)
                    .setRequired(true);

            const responseInput =
                new TextInputBuilder()
                    .setCustomId(
                        "autoresponder_response"
                    )
                    .setLabel(
                        "Response"
                    )
                    .setPlaceholder(
                        "What should ASTER respond with?"
                    )
                    .setStyle(
                        TextInputStyle.Paragraph
                    )
                    .setMaxLength(4000)
                    .setRequired(true);

            modal.addComponents(

                new ActionRowBuilder()
                    .addComponents(
                        triggerInput
                    ),

                new ActionRowBuilder()
                    .addComponents(
                        responseInput
                    )
            );

            return interaction.showModal(
                modal
            );
        }


        // ========================================================
        // SAVE AUTORESPONDER
        // ========================================================

        if (
            interaction.customId ===
            "autoresponder_add_modal"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage autoresponders.",
                    ephemeral: true
                });
            }

            const trigger =
                interaction.fields
                    .getTextInputValue(
                        "autoresponder_trigger"
                    )
                    .trim()
                    .toLowerCase();

            const response =
                interaction.fields
                    .getTextInputValue(
                        "autoresponder_response"
                    )
                    .trim();

            if (!trigger) {
                return interaction.reply({
                    content:
                        "❌ Trigger cannot be empty.",
                    ephemeral: true
                });
            }

            if (!response) {
                return interaction.reply({
                    content:
                        "❌ Response cannot be empty.",
                    ephemeral: true
                });
            }

            const existing =
                getGuild(
                    interaction.guild.id
                ).has(trigger);

            if (existing) {
                return interaction.reply({
                    content:
                        `❌ An autoresponder for \`${trigger}\` already exists.`,
                    ephemeral: true
                });
            }

            const guildEntries =
                getAutoresponderEntries(
                    interaction.guild.id
                );

            if (
                guildEntries.length >=
                MAX_AUTORESPONDERS_PER_GUILD
            ) {
                return interaction.reply({
                    content:
                        `❌ This server already has the maximum of **${MAX_AUTORESPONDERS_PER_GUILD}** autoresponders.`,
                    ephemeral: true
                });
            }

            try {

                await add(
                    interaction.guild.id,
                    trigger,
                    "text",
                    response
                );

            } catch (error) {

                console.error(
                    "ASTER autoresponder add failed:",
                    error
                );

                return interaction.reply({
                    content:
                        "❌ Failed to save the autoresponder.",
                    ephemeral: true
                });
            }

            asterLogger.autoresponder(
                interaction.guild.id,
                "Autoresponder Added",
                `A new autoresponder was added for \`${trigger}\`.`,
                interaction.user,
                {
                    "Trigger":
                        trigger,
                    "Type":
                        "text",
                    "Response":
                        response
                }
            ).catch(console.error);

            return interaction.reply({
                components: [
                    autoresponderConfirmation(
                        "Autoresponder Added",
                        `ASTER will now respond when the trigger \`${trigger}\` is detected.`
                    )
                ],
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });
        }


        // ========================================================
        // AUTORESPONDER LIST / VIEW
        // ========================================================

        if (
            interaction.customId ===
            "autoresponder_list"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage autoresponders.",
                    ephemeral: true
                });
            }

            return interaction.update({
                components:
                    buildAutoresponderManager(
                        interaction.guild.id,
                        0
                    ),
                flags:
                    MessageFlags.IsComponentsV2
            });
        }


        // ========================================================
        // AUTORESPONDER PAGINATION
        // ========================================================

        if (
            interaction.customId.startsWith(
                "autoresponder_page_"
            )
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage autoresponders.",
                    ephemeral: true
                });
            }

            const page = parseInt(
                interaction.customId.replace(
                    "autoresponder_page_",
                    ""
                ),
                10
            );

            if (!Number.isInteger(page)) {
                return interaction.reply({
                    content:
                        "❌ Invalid autoresponder page.",
                    ephemeral: true
                });
            }

            return interaction.update({
                components:
                    buildAutoresponderManager(
                        interaction.guild.id,
                        page
                    ),
                flags:
                    MessageFlags.IsComponentsV2
            });
        }


        // ========================================================
        // DELETE INDIVIDUAL AUTORESPONDER
        // ========================================================

        if (
            interaction.customId.startsWith(
                "autoresponder_delete_"
            )
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage autoresponders.",
                    ephemeral: true
                });
            }

            const parts =
                interaction.customId.split("_");

            const page =
                parseInt(parts[2], 10);

            const index =
                parseInt(parts[3], 10);

            const entry =
                getAutoresponderFromPage(
                    interaction.guild.id,
                    page,
                    index
                );

            if (!entry) {
                return interaction.reply({
                    content:
                        "❌ That autoresponder no longer exists.",
                    ephemeral: true
                });
            }

            const trigger = entry[0];
            const response = entry[1];

            try {

                await remove(
                    interaction.guild.id,
                    trigger
                );

            } catch (error) {

                console.error(
                    "ASTER autoresponder delete failed:",
                    error
                );

                return interaction.reply({
                    content:
                        "❌ Failed to remove the autoresponder.",
                    ephemeral: true
                });
            }

            asterLogger.autoresponder(
                interaction.guild.id,
                "Autoresponder Removed",
                `The autoresponder \`${trigger}\` was removed.`,
                interaction.user,
                {
                    "Trigger":
                        trigger,
                    "Type":
                        response?.type || "text"
                }
            ).catch(console.error);

            const remaining =
                getAutoresponderEntries(
                    interaction.guild.id
                );

            const totalPages =
                Math.max(
                    1,
                    Math.ceil(
                        remaining.length /
                        AUTORESPONDERS_PER_PAGE
                    )
                );

            const safePage =
                Math.min(
                    page,
                    totalPages - 1
                );

            return interaction.update({
                components:
                    buildAutoresponderManager(
                        interaction.guild.id,
                        safePage
                    ),
                flags:
                    MessageFlags.IsComponentsV2
            });
        }


        // ========================================================
        // CLEAR ALL AUTORESPONDERS
        // ========================================================

        if (
            interaction.customId ===
            "autoresponder_clear"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage autoresponders.",
                    ephemeral: true
                });
            }

            const entries =
                getAutoresponderEntries(
                    interaction.guild.id
                );

            if (!entries.length) {
                return interaction.reply({
                    content:
                        "ℹ️ There are no autoresponders to clear.",
                    ephemeral: true
                });
            }

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        "autoresponder_clear_confirm_modal"
                    )
                    .setTitle(
                        "ASTER • Clear Autoresponders"
                    );

            const confirmInput =
                new TextInputBuilder()
                    .setCustomId(
                        "autoresponder_clear_confirmation"
                    )
                    .setLabel(
                        "Type CLEAR to confirm"
                    )
                    .setPlaceholder(
                        "CLEAR"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setMaxLength(5)
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(
                        confirmInput
                    )
            );

            return interaction.showModal(
                modal
            );
        }


        // ========================================================
        // CONFIRM CLEAR ALL AUTORESPONDERS
        // ========================================================

        if (
            interaction.customId ===
            "autoresponder_clear_confirm_modal"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage autoresponders.",
                    ephemeral: true
                });
            }

            const confirmation =
                interaction.fields
                    .getTextInputValue(
                        "autoresponder_clear_confirmation"
                    )
                    .trim()
                    .toUpperCase();

            if (confirmation !== "CLEAR") {
                return interaction.reply({
                    content:
                        "❌ Clear cancelled. You must type **CLEAR** exactly.",
                    ephemeral: true
                });
            }

            const entries =
                getAutoresponderEntries(
                    interaction.guild.id
                );

            if (!entries.length) {
                return interaction.reply({
                    content:
                        "ℹ️ There are no autoresponders to clear.",
                    ephemeral: true
                });
            }

            const count =
                entries.length;

            try {

                await clear(
                    interaction.guild.id
                );

            } catch (error) {

                console.error(
                    "ASTER autoresponder clear failed:",
                    error
                );

                return interaction.reply({
                    content:
                        "❌ Failed to clear autoresponders.",
                    ephemeral: true
                });
            }

            asterLogger.autoresponder(
                interaction.guild.id,
                "Autoresponders Cleared",
                `All ${count} autoresponders were removed.`,
                interaction.user,
                {
                    "Removed":
                        count
                }
            ).catch(console.error);

            return interaction.reply({
                components: [
                    autoresponderConfirmation(
                        "Autoresponders Cleared",
                        `ASTER removed **${count}** autoresponder${count === 1 ? "" : "s"} from this server.`
                    )
                ],
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });
        }


        // ========================================================
        // SAVE LEADERBOARD CHANNEL
        // ========================================================

        if (
            interaction.customId ===
            "set_leaderboard_channel"
        ) {

            ensureServerConfig(
                interaction.guild.id
            );

            const channelId =
                interaction.values[0];

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


        // ========================================================
        // ACTIVITY REWARD ROLES
        // ========================================================

        if (
            interaction.customId ===
            "config_roles"
        ) {

            const chatMenu =
                new ActionRowBuilder()
                    .addComponents(

                        new RoleSelectMenuBuilder()
                            .setCustomId(
                                "set_chat_role"
                            )
                            .setPlaceholder(
                                "Select Chat King role"
                            )
                            .setMinValues(1)
                            .setMaxValues(1)
                    );

            const voiceMenu =
                new ActionRowBuilder()
                    .addComponents(

                        new RoleSelectMenuBuilder()
                            .setCustomId(
                                "set_voice_role"
                            )
                            .setPlaceholder(
                                "Select Voice King role"
                            )
                            .setMinValues(1)
                            .setMaxValues(1)
                    );

            const removeChatRow =
                new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                "remove_chat_role"
                            )
                            .setLabel(
                                "Remove Chat King"
                            )
                            .setStyle(
                                ButtonStyle.Danger
                            )
                    );

            const removeVoiceRow =
                new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                "remove_voice_role"
                            )
                            .setLabel(
                                "Remove Voice King"
                            )
                            .setStyle(
                                ButtonStyle.Danger
                            )
                    );

            return interaction.reply({
                content:
                    "👑 **Activity Reward Roles**\n\n" +
                    "Select the roles ASTER should assign to the #1 activity winners.\n\n" +
                    "**Chat King** — weekly #1 chat member\n" +
                    "**Voice King** — weekly #1 voice member\n\n" +
                    "You can also remove either role completely.",
                components: [
                    chatMenu,
                    voiceMenu,
                    removeChatRow,
                    removeVoiceRow
                ],
                ephemeral: true
            });
        }


        // ========================================================
        // SAVE CHAT KING ROLE
        // ========================================================

        if (
            interaction.customId ===
            "set_chat_role"
        ) {

            ensureServerConfig(
                interaction.guild.id
            );

            const roleId =
                interaction.values[0];

            db.prepare(`
                UPDATE server_config
                SET chat_king_role = ?
                WHERE guild_id = ?
            `).run(
                roleId,
                interaction.guild.id
            );

            return interaction.update({
                content:
                    `✅ **Chat King** role saved: <@&${roleId}>`,
                components: []
            });
        }


        // ========================================================
        // SAVE VOICE KING ROLE
        // ========================================================

        if (
            interaction.customId ===
            "set_voice_role"
        ) {

            ensureServerConfig(
                interaction.guild.id
            );

            const roleId =
                interaction.values[0];

            db.prepare(`
                UPDATE server_config
                SET voice_king_role = ?
                WHERE guild_id = ?
            `).run(
                roleId,
                interaction.guild.id
            );

            return interaction.update({
                content:
                    `✅ **Voice King** role saved: <@&${roleId}>`,
                components: []
            });
        }


        // ========================================================
        // REMOVE CHAT KING ROLE
        // ========================================================

        if (
            interaction.customId ===
            "remove_chat_role"
        ) {

            ensureServerConfig(
                interaction.guild.id
            );

            db.prepare(`
                UPDATE server_config
                SET chat_king_role = NULL
                WHERE guild_id = ?
            `).run(
                interaction.guild.id
            );

            return interaction.update({
                content:
                    "🗑️ **Chat King** reward role removed.\n\n" +
                    "ASTER will no longer assign a Chat King role.",
                components: []
            });
        }


        // ========================================================
        // REMOVE VOICE KING ROLE
        // ========================================================

        if (
            interaction.customId ===
            "remove_voice_role"
        ) {

            ensureServerConfig(
                interaction.guild.id
            );

            db.prepare(`
                UPDATE server_config
                SET voice_king_role = NULL
                WHERE guild_id = ?
            `).run(
                interaction.guild.id
            );

            return interaction.update({
                content:
                    "🗑️ **Voice King** reward role removed.\n\n" +
                    "ASTER will no longer assign a Voice King role.",
                components: []
            });
        }


        // ========================================================
        // REP CONFIG
        // ========================================================

        if (
            interaction.customId ===
            "config_rep"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            ensureServerConfig(
                interaction.guild.id
            );

            const baseLimit =
                getRepBaseLimit(
                    interaction.guild.id
                );

            const roleBonuses =
                getRepRoleBonuses(
                    interaction.guild.id
                );

            const container =
                new ContainerBuilder()
                    .setAccentColor(0xFF006E)

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "# ✨ ASTER • Reputation\n" +
                                "Configure how reputation works in this server.\n\n" +
                                "Members can give **+1 reputation** with `+rep` " +
                                "or remove **1 reputation** with `-rep`."
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `### 🎯 Daily Giving Limits\n\n` +
                                `**Base:** ${baseLimit}/day\n` +
                                `**Role bonuses:** ${roleBonuses.length} configured\n\n` +
                                "Role bonuses stack together. A member's current Discord roles determine their limit every time they use `,rep`."
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "### 🏅 Reputation Rewards\n\n" +
                                "Configure roles members can unlock based on their reputation score."
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "💡 **Example:** Base 3 + Booster 2 + Staff 2 + Donor 2 + Level 50 1 = **10 reputation/day**."
                            )
                    );

            const buttons =
                new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                "rep_limits"
                            )
                            .setLabel(
                                "⚙️ Daily Limits"
                            )
                            .setStyle(
                                ButtonStyle.Primary
                            ),

                        new ButtonBuilder()
                            .setCustomId(
                                "rep_rewards"
                            )
                            .setLabel(
                                "🏅 Rewards"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            )
                    );

            return interaction.reply({
                components: [
                    container,
                    buttons
                ],
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });
        }


        // ========================================================
        // OPEN REP DAILY LIMIT MANAGER
        // ========================================================

        if (
            interaction.customId ===
            "rep_limits"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            return interaction.reply({
                components:
                    buildRepLimitsManager(
                        interaction.guild
                    ),
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });
        }



        if (
    interaction.customId ===
    "rep_limits_view_roles"
) {
    if (!isAdministrator(interaction)) {
        return interaction.reply({
            content:
                "❌ You need Administrator permission to manage reputation settings.",
            ephemeral: true
        });
    }

    const guild = interaction.guild;
    const guildId = guild.id;

    ensureServerConfig(guildId);

    const baseLimit =
        getRepBaseLimit(guildId);

    const bonuses =
        getRepRoleBonuses(guildId);

    let roleText;

    if (!bonuses.length) {
        roleText =
            "No role bonuses are configured yet.\n\n" +
            "-# Use **＋ Add Role Bonus** to configure one.";
    } else {
        const lines = bonuses.map((entry, index) => {
            const role =
                guild.roles.cache.get(String(entry.role_id));

            const bonus =
                Number(entry.bonus);

            if (!role) {
                return (
                    `${index + 1}. Unknown / Deleted Role \`${entry.role_id}\`\n` +
                    `   Bonus: **+${bonus}/day**\n` +
                    `   Rep limit: **${baseLimit + bonus}/day**`
                );
            }

            return (
                `${index + 1}. <@&${role.id}>\n` +
                `   Bonus: **+${bonus}/day**\n` +
                `   Rep limit: **${baseLimit + bonus}/day**`
            );
        });

        roleText = lines.join("\n\n");

        if (roleText.length > 3500) {
            roleText =
                roleText.slice(0, 3450) +
                "\n\n-# Some entries are not shown because the list is too long.";
        }
    }

    const totalBonus =
        bonuses.reduce(
            (total, entry) =>
                total + Math.max(0, Number(entry.bonus) || 0),
            0
        );

    const maximumLimit =
        baseLimit + totalBonus;

    const container =
        new ContainerBuilder()
            .setAccentColor(0xFF006E)
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        "# 📋 ASTER • Configured Role Bonuses\n" +
                        "-# View every configured reputation role bonus and its individual daily limit."
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `### 🎯 Base Daily Limit\n\n` +
                        `**${baseLimit}/day**`
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `### 🏷️ Configured Roles\n\n` +
                        `**${bonuses.length}** role bonus${bonuses.length === 1 ? "" : "es"} configured.\n\n` +
                        roleText
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `### 📊 Maximum Configured Limit\n\n` +
                        `Base: **${baseLimit}/day**\n` +
                        `All role bonuses combined: **+${totalBonus}/day**\n` +
                        `Maximum: **${maximumLimit}/day**\n\n` +
                        "-# Role bonuses stack when a member has multiple configured roles."
                    )
            );

    const backRow =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("rep_limits")
                    .setLabel("← Back to Daily Limits")
                    .setStyle(ButtonStyle.Secondary)
            );

    return interaction.reply({
        components: [
            container,
            backRow
        ],
        flags:
            MessageFlags.IsComponentsV2 |
            MessageFlags.Ephemeral
    });
}


        // ========================================================
        // SET BASE LIMIT BUTTON
        // ========================================================

        if (
            interaction.customId ===
            "rep_limits_set_base"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            ensureServerConfig(
                interaction.guild.id
            );

            const currentBase =
                getRepBaseLimit(
                    interaction.guild.id
                );

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        "rep_limits_base_modal"
                    )
                    .setTitle(
                        "ASTER • Base Daily Limit"
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        "rep_base_limit"
                    )
                    .setLabel(
                        "Base daily reputation limit"
                    )
                    .setPlaceholder(
                        "Example: 3"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setValue(
                        String(currentBase)
                    )
                    .setRequired(true)
                    .setMaxLength(3);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            return interaction.showModal(
                modal
            );
        }


        // ========================================================
        // SAVE BASE LIMIT
        // ========================================================

        if (
            interaction.customId ===
            "rep_limits_base_modal"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const value =
                interaction.fields
                    .getTextInputValue(
                        "rep_base_limit"
                    );

            const baseLimit =
                parseRepLimit(value);

            if (baseLimit === null) {
                return interaction.reply({
                    content:
                        "❌ The base daily limit must be a whole number between **0 and 100**.",
                    ephemeral: true
                });
            }

            ensureServerConfig(
                interaction.guild.id
            );

            db.prepare(`
                UPDATE server_config
                SET rep_member_limit = ?
                WHERE guild_id = ?
            `).run(
                baseLimit,
                interaction.guild.id
            );

            return interaction.reply({
                content:
                    `✅ Base reputation daily limit set to **${baseLimit}/day**.\n\n` +
                    `All members now start with **${baseLimit}** daily reputation actions before role bonuses are applied.`,
                ephemeral: true
            });
        }


        // ========================================================
        // ADD ROLE BONUS BUTTON
        // ========================================================

        if (
            interaction.customId ===
            "rep_limits_add_role"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const roleMenu =
                new ActionRowBuilder()
                    .addComponents(

                        new RoleSelectMenuBuilder()
                            .setCustomId(
                                "rep_limits_add_role_select"
                            )
                            .setPlaceholder(
                                "Select a Discord role"
                            )
                            .setMinValues(1)
                            .setMaxValues(1)
                    );

            const container =
                new ContainerBuilder()
                    .setAccentColor(0xFF006E)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "# ✨ ASTER • Add Role Bonus\n" +
                                "-# Select the Discord role that should receive an additional daily reputation allowance.\n\n" +
                                "The role must exist in this server.\n\n" +
                                "-# If the role already has a bonus, ASTER will ask you to use **Edit Role Bonus** instead."
                            )
                    );

            return interaction.reply({
                components: [
                    container,
                    roleMenu
                ],
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });
        }


        // ========================================================
        // ADD ROLE BONUS — ROLE SELECT
        // ========================================================

        if (
            interaction.customId ===
            "rep_limits_add_role_select"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const roleId =
                interaction.values[0];

            const role =
                interaction.guild.roles.cache.get(
                    roleId
                );

            if (!role) {
                return interaction.reply({
                    content:
                        "❌ That Discord role no longer exists.",
                    ephemeral: true
                });
            }

            if (
                role.id ===
                interaction.guild.id
            ) {
                return interaction.reply({
                    content:
                        "❌ The @everyone role cannot be configured as a reputation bonus.",
                    ephemeral: true
                });
            }

            const existing =
                getRepRoleBonus(
                    interaction.guild.id,
                    roleId
                );

            if (existing) {
                return interaction.reply({
                    content:
                        `❌ **${role.name}** already has a **+${existing.bonus}/day** bonus.\n\n` +
                        `Use **Edit Role Bonus** to change it.`,
                    ephemeral: true
                });
            }

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        `rep_limits_add_bonus_modal_${roleId}`
                    )
                    .setTitle(
                        "ASTER • Add Role Bonus"
                    );

            const bonusInput =
                new TextInputBuilder()
                    .setCustomId(
                        "rep_role_bonus"
                    )
                    .setLabel(
                        "Daily reputation bonus"
                    )
                    .setPlaceholder(
                        "Example: 2"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true)
                    .setMaxLength(3);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(
                        bonusInput
                    )
            );

            return interaction.showModal(
                modal
            );
        }


        // ========================================================
        // SAVE NEW ROLE BONUS
        // ========================================================

        if (
            interaction.customId.startsWith(
                "rep_limits_add_bonus_modal_"
            )
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const roleId =
                interaction.customId.replace(
                    "rep_limits_add_bonus_modal_",
                    ""
                );

            const role =
                interaction.guild.roles.cache.get(
                    roleId
                );

            if (!role) {
                return interaction.reply({
                    content:
                        "❌ That Discord role no longer exists.",
                    ephemeral: true
                });
            }

            if (
                role.id ===
                interaction.guild.id
            ) {
                return interaction.reply({
                    content:
                        "❌ The @everyone role cannot be configured as a reputation bonus.",
                    ephemeral: true
                });
            }

            const value =
                interaction.fields
                    .getTextInputValue(
                        "rep_role_bonus"
                    );

            const bonus =
                parseRepLimit(value);

            if (bonus === null) {
                return interaction.reply({
                    content:
                        "❌ The role bonus must be a whole number between **0 and 100**.",
                    ephemeral: true
                });
            }

            const existing =
                getRepRoleBonus(
                    interaction.guild.id,
                    roleId
                );

            if (existing) {
                return interaction.reply({
                    content:
                        `❌ **${role.name}** already has a **+${existing.bonus}/day** bonus.\n\n` +
                        `Use **Edit Role Bonus** instead.`,
                    ephemeral: true
                });
            }

            db.prepare(`
                INSERT INTO rep_role_limits (
                    guild_id,
                    role_id,
                    bonus
                )
                VALUES (?, ?, ?)
            `).run(
                interaction.guild.id,
                roleId,
                bonus
            );

            return interaction.reply({
                content:
                    `✅ Role bonus added.\n\n` +
                    `**Role:** <@&${roleId}>\n` +
                    `**Bonus:** +${bonus}/day`,
                ephemeral: true
            });
        }


        // ========================================================
        // EDIT ROLE BONUS BUTTON
        // ========================================================

        if (
            interaction.customId ===
            "rep_limits_edit_role"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const bonuses =
                getRepRoleBonuses(
                    interaction.guild.id
                );

            if (!bonuses.length) {
                return interaction.reply({
                    content:
                        "ℹ️ There are no role bonuses configured yet.",
                    ephemeral: true
                });
            }

            const roleMenu =
                new ActionRowBuilder()
                    .addComponents(

                        new RoleSelectMenuBuilder()
                            .setCustomId(
                                "rep_limits_edit_role_select"
                            )
                            .setPlaceholder(
                                "Select a configured role"
                            )
                            .setMinValues(1)
                            .setMaxValues(1)
                    );

            const container =
                new ContainerBuilder()
                    .setAccentColor(0xFF006E)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "# ✨ ASTER • Edit Role Bonus\n" +
                                "-# Select a configured Discord role and change its existing bonus.\n\n" +
                                "Editing updates the existing configuration. It will **not** create a duplicate."
                            )
                    );

            return interaction.reply({
                components: [
                    container,
                    roleMenu
                ],
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });
        }


        // ========================================================
        // EDIT ROLE BONUS — ROLE SELECT
        // ========================================================

        if (
            interaction.customId ===
            "rep_limits_edit_role_select"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const roleId =
                interaction.values[0];

            const role =
                interaction.guild.roles.cache.get(
                    roleId
                );

            const existing =
                getRepRoleBonus(
                    interaction.guild.id,
                    roleId
                );

            if (!existing) {
                return interaction.reply({
                    content:
                        "❌ That role does not have a configured reputation bonus.",
                    ephemeral: true
                });
            }

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        `rep_limits_edit_bonus_modal_${roleId}`
                    )
                    .setTitle(
                        "ASTER • Edit Role Bonus"
                    );

            const bonusInput =
                new TextInputBuilder()
                    .setCustomId(
                        "rep_role_bonus"
                    )
                    .setLabel(
                        "Daily reputation bonus"
                    )
                    .setPlaceholder(
                        "Example: 2"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setValue(
                        String(existing.bonus)
                    )
                    .setRequired(true)
                    .setMaxLength(3);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(
                        bonusInput
                    )
            );

            return interaction.showModal(
                modal
            );
        }


        // ========================================================
        // SAVE EDITED ROLE BONUS
        // ========================================================

        if (
            interaction.customId.startsWith(
                "rep_limits_edit_bonus_modal_"
            )
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const roleId =
                interaction.customId.replace(
                    "rep_limits_edit_bonus_modal_",
                    ""
                );

            const role =
                interaction.guild.roles.cache.get(
                    roleId
                );

            const existing =
                getRepRoleBonus(
                    interaction.guild.id,
                    roleId
                );

            if (!existing) {
                return interaction.reply({
                    content:
                        "❌ That role bonus no longer exists.",
                    ephemeral: true
                });
            }

            const value =
                interaction.fields
                    .getTextInputValue(
                        "rep_role_bonus"
                    );

            const bonus =
                parseRepLimit(value);

            if (bonus === null) {
                return interaction.reply({
                    content:
                        "❌ The role bonus must be a whole number between **0 and 100**.",
                    ephemeral: true
                });
            }

            db.prepare(`
                UPDATE rep_role_limits
                SET bonus = ?
                WHERE guild_id = ?
                  AND role_id = ?
            `).run(
                bonus,
                interaction.guild.id,
                roleId
            );

            return interaction.reply({
                content:
                    `✅ Role bonus updated.\n\n` +
                    `**Role:** ${role ? `<@&${roleId}>` : `\`${roleId}\``}\n` +
                    `**Previous:** +${existing.bonus}/day\n` +
                    `**New:** +${bonus}/day`,
                ephemeral: true
            });
        }


        // ========================================================
        // REMOVE ROLE BONUS BUTTON
        // ========================================================

        if (
            interaction.customId ===
            "rep_limits_remove_role"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const bonuses =
                getRepRoleBonuses(
                    interaction.guild.id
                );

            if (!bonuses.length) {
                return interaction.reply({
                    content:
                        "ℹ️ There are no role bonuses configured yet.",
                    ephemeral: true
                });
            }

            const roleMenu =
                new ActionRowBuilder()
                    .addComponents(

                        new RoleSelectMenuBuilder()
                            .setCustomId(
                                "rep_limits_remove_role_select"
                            )
                            .setPlaceholder(
                                "Select a configured role"
                            )
                            .setMinValues(1)
                            .setMaxValues(1)
                    );

            const container =
                new ContainerBuilder()
                    .setAccentColor(0xFF006E)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "# ✨ ASTER • Remove Role Bonus\n" +
                                "-# Select the Discord role whose reputation bonus should be removed.\n\n" +
                                "Removing the bonus does not remove the Discord role itself."
                            )
                    );

            return interaction.reply({
                components: [
                    container,
                    roleMenu
                ],
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });
        }


        // ========================================================
        // REMOVE ROLE BONUS — ROLE SELECT
        // ========================================================

        if (
            interaction.customId ===
            "rep_limits_remove_role_select"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const roleId =
                interaction.values[0];

            const existing =
                getRepRoleBonus(
                    interaction.guild.id,
                    roleId
                );

            if (!existing) {
                return interaction.reply({
                    content:
                        "❌ That role does not have a configured reputation bonus.",
                    ephemeral: true
                });
            }

            const role =
                interaction.guild.roles.cache.get(
                    roleId
                );

            db.prepare(`
                DELETE FROM rep_role_limits
                WHERE guild_id = ?
                  AND role_id = ?
            `).run(
                interaction.guild.id,
                roleId
            );

            return interaction.reply({
                content:
                    `🗑️ Role bonus removed.\n\n` +
                    `**Role:** ${role ? `<@&${roleId}>` : `\`${roleId}\``}\n` +
                    `**Removed bonus:** +${existing.bonus}/day`,
                ephemeral: true
            });
        }


        // ========================================================
        // ADD REP REWARD
        // ========================================================

        if (
            interaction.customId ===
            "rep_reward_add"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        "rep_reward_add_modal"
                    )
                    .setTitle(
                        "ASTER • Add Rep Reward"
                    );

            const roleInput =
                new TextInputBuilder()
                    .setCustomId(
                        "rep_reward_role"
                    )
                    .setLabel(
                        "Role ID"
                    )
                    .setPlaceholder(
                        "Enter the Discord role ID"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true);

            const thresholdInput =
                new TextInputBuilder()
                    .setCustomId(
                        "rep_reward_threshold"
                    )
                    .setLabel(
                        "Positive rep threshold"
                    )
                    .setPlaceholder(
                        "Example: 10"
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true);

            modal.addComponents(

                new ActionRowBuilder()
                    .addComponents(
                        roleInput
                    ),

                new ActionRowBuilder()
                    .addComponents(
                        thresholdInput
                    )
            );

            return interaction.showModal(
                modal
            );
        }


        // ========================================================
        // SAVE REP REWARD
        // ========================================================

        if (
            interaction.customId ===
            "rep_reward_add_modal"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const roleId =
                interaction.fields
                    .getTextInputValue(
                        "rep_reward_role"
                    )
                    .trim();

            const threshold =
                parseInt(
                    interaction.fields
                        .getTextInputValue(
                            "rep_reward_threshold"
                        )
                        .trim()
                );

            if (!/^\d{17,20}$/.test(roleId)) {
                return interaction.reply({
                    content:
                        "❌ Invalid Discord role ID.",
                    ephemeral: true
                });
            }

            if (
                !Number.isInteger(threshold) ||
                threshold <= 0 ||
                threshold > 1000000
            ) {
                return interaction.reply({
                    content:
                        "❌ The reputation threshold must be a whole number greater than 0.",
                    ephemeral: true
                });
            }

            const role =
                interaction.guild.roles.cache.get(
                    roleId
                );

            if (!role) {
                return interaction.reply({
                    content:
                        "❌ That role doesn't exist in this server.",
                    ephemeral: true
                });
            }

            db.prepare(`
                INSERT INTO reputation_rewards
                (guild_id, role_id, threshold, type, enabled)
                VALUES (?, ?, ?, 'positive', 1)
            `).run(
                interaction.guild.id,
                roleId,
                threshold
            );

            return interaction.reply({
                content:
                    `✅ Rep reward added!\n\n` +
                    `Role: <@&${roleId}>\n` +
                    `Threshold: **+${threshold} reputation**`,
                ephemeral: true
            });
        }


        // ========================================================
        // MANAGE REP REWARDS
        // ========================================================

        if (
            interaction.customId ===
            "rep_reward_manage"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const rewards =
                db.prepare(`
                    SELECT
                        id,
                        role_id,
                        threshold,
                        type,
                        enabled
                    FROM reputation_rewards
                    WHERE guild_id = ?
                    ORDER BY threshold ASC
                `).all(
                    interaction.guild.id
                );

            if (!rewards.length) {
                return interaction.reply({
                    content:
                        "ℹ️ There are no reputation rewards to manage yet.",
                    ephemeral: true
                });
            }

            const rows =
                rewards
                    .slice(0, 5)
                    .map(reward => {

                        return new ActionRowBuilder()
                            .addComponents(

                                new ButtonBuilder()
                                    .setCustomId(
                                        `rep_reward_toggle_${reward.id}`
                                    )
                                    .setLabel(
                                        reward.enabled
                                            ? "Disable"
                                            : "Enable"
                                    )
                                    .setStyle(
                                        reward.enabled
                                            ? ButtonStyle.Secondary
                                            : ButtonStyle.Success
                                    ),

                                new ButtonBuilder()
                                    .setCustomId(
                                        `rep_reward_delete_${reward.id}`
                                    )
                                    .setLabel(
                                        "Delete"
                                    )
                                    .setStyle(
                                        ButtonStyle.Danger
                                    )
                            );
                    });

            const description =
                rewards
                    .map(reward =>
                        `${reward.type === "negative" ? "−" : "+"} **${reward.threshold}** → <@&${reward.role_id}> ` +
                        `${reward.enabled ? "• Enabled" : "• Disabled"}`
                    )
                    .join("\n");

            const container =
                new ContainerBuilder()
                    .setAccentColor(0xFF4DA6)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "# ⚙️ ASTER • Manage Rep Rewards\n\n" +
                                description
                            )
                    );

            return interaction.reply({
                components: [
                    container,
                    ...rows
                ],
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });
        }


        // ========================================================
        // TOGGLE REP REWARD
        // ========================================================

        if (
            interaction.customId.startsWith(
                "rep_reward_toggle_"
            )
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const rewardId =
                parseInt(
                    interaction.customId.replace(
                        "rep_reward_toggle_",
                        ""
                    ),
                    10
                );

            if (!Number.isInteger(rewardId)) {
                return interaction.reply({
                    content:
                        "❌ Invalid reward.",
                    ephemeral: true
                });
            }

            const reward =
                db.prepare(`
                    SELECT enabled
                    FROM reputation_rewards
                    WHERE id = ?
                    AND guild_id = ?
                `).get(
                    rewardId,
                    interaction.guild.id
                );

            if (!reward) {
                return interaction.reply({
                    content:
                        "❌ Reward not found.",
                    ephemeral: true
                });
            }

            const newState =
                reward.enabled
                    ? 0
                    : 1;

            db.prepare(`
                UPDATE reputation_rewards
                SET enabled = ?
                WHERE id = ?
                AND guild_id = ?
            `).run(
                newState,
                rewardId,
                interaction.guild.id
            );

            return interaction.reply({
                content:
                    `✅ Reward **${newState ? "enabled" : "disabled"}**.`,
                ephemeral: true
            });
        }


        // ========================================================
        // DELETE REP REWARD
        // ========================================================

        if (
            interaction.customId.startsWith(
                "rep_reward_delete_"
            )
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const rewardId =
                parseInt(
                    interaction.customId.replace(
                        "rep_reward_delete_",
                        ""
                    ),
                    10
                );

            if (!Number.isInteger(rewardId)) {
                return interaction.reply({
                    content:
                        "❌ Invalid reward.",
                    ephemeral: true
                });
            }

            const reward =
                db.prepare(`
                    SELECT
                        role_id,
                        threshold,
                        type
                    FROM reputation_rewards
                    WHERE id = ?
                    AND guild_id = ?
                `).get(
                    rewardId,
                    interaction.guild.id
                );

            if (!reward) {
                return interaction.reply({
                    content:
                        "❌ Reward not found.",
                    ephemeral: true
                });
            }

            db.prepare(`
                DELETE FROM reputation_rewards
                WHERE id = ?
                AND guild_id = ?
            `).run(
                rewardId,
                interaction.guild.id
            );

            return interaction.reply({
                content:
                    `🗑️ Removed the **${reward.type === "negative" ? "-" : "+"}${reward.threshold}** reputation reward.`,
                ephemeral: true
            });
        }


        // ========================================================
        // REP REWARDS
        // ========================================================

        if (
            interaction.customId ===
            "rep_rewards"
        ) {

            if (!isAdministrator(interaction)) {
                return interaction.reply({
                    content:
                        "❌ You need Administrator permission to manage reputation settings.",
                    ephemeral: true
                });
            }

            const rewards =
                db.prepare(`
                    SELECT
                        id,
                        role_id,
                        threshold,
                        type,
                        enabled
                    FROM reputation_rewards
                    WHERE guild_id = ?
                    ORDER BY threshold ASC
                `).all(
                    interaction.guild.id
                );

            const rewardText =
                rewards.length
                    ? rewards
                        .map(reward =>
                            `${reward.type === "negative" ? "−" : "+"} **${reward.threshold}** → <@&${reward.role_id}> ${reward.enabled ? "• Enabled" : "• Disabled"}`
                        )
                        .join("\n")
                    : "No reputation rewards configured yet.";

            const container =
                new ContainerBuilder()
                    .setAccentColor(0xFF4DA6)

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "# 🏅 ASTER • Reputation Rewards\n" +
                                "Configure role rewards based on reputation thresholds."
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "### Current Rewards\n" +
                                rewardText
                            )
                    );

            const buttons =
                new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                "rep_reward_add"
                            )
                            .setLabel(
                                "＋ Add Reward"
                            )
                            .setStyle(
                                ButtonStyle.Success
                            ),

                        new ButtonBuilder()
                            .setCustomId(
                                "rep_reward_manage"
                            )
                            .setLabel(
                                "⚙ Manage Rewards"
                            )
                            .setStyle(
                                ButtonStyle.Secondary
                            )
                    );

            return interaction.reply({
                components: [
                    container,
                    buttons
                ],
                flags:
                    MessageFlags.IsComponentsV2 |
                    MessageFlags.Ephemeral
            });
        }

    } catch (error) {

        console.error(
            "ASTER interactionCreate error:",
            error
        );

        if (
            interaction.replied ||
            interaction.deferred
        ) {
            return;
        }

        return interaction.reply({
            content:
                "❌ ASTER encountered an error while processing that interaction.",
            ephemeral: true
        }).catch(replyError => {
            console.error(
                "ASTER failed to send interaction error:",
                replyError
            );
        });
    }
};