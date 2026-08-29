const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const { getConfig } = require("../utils/serverConfig");

// ========================================================
// ASTER UI
// ========================================================

const symbols = require("../utils/asterUI/symbols");
const styles = require("../utils/asterUI/styles");
const timestamps = require("../utils/asterUI/timestamps");

// ========================================================
// CONFIG COMMAND
// ========================================================

module.exports = {
    name: "config",
    aliases: ["setup"],

    async execute(message) {

        // ====================================================
        // PERMISSIONS
        // ====================================================

        if (
            !message.member.permissions.has(
                PermissionFlagsBits.Administrator
            )
        ) {
            return message.reply(
                `${symbols.error} You need **Administrator** permission.`
            );
        }

        // Make sure config exists
        const config = getConfig(message.guild.id);

        // ====================================================
        // LOGGING STATUS
        // ====================================================

        const loggingStatus = config?.log_channel
            ? `<#${config.log_channel}>`
            : "Not configured";

        // ====================================================
        // ASTER CONFIG CONTAINER
        // ====================================================

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4DA6)

            // =================================================
            // HEADER
            // =================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# ${styles.brand.symbol} ASTER / SERVER CONFIGURATION\n` +
                    `-# Configure how ASTER operates in this server.\n\n` +
                    `ASTER uses this panel to manage activity tracking, ` +
                    `leaderboards, reputation, automation and system logging.`
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // =================================================
            // LEADERBOARDS
            // =================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${symbols.leaderboard} Leaderboards\n` +
                    `Manage leaderboard channels, activity rankings and ` +
                    `leaderboard reward roles.`
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // =================================================
            // REWARD ROLES
            // =================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${symbols.trophy} Reward Roles\n` +
                    `Configure roles awarded to members who reach the top ` +
                    `positions on activity leaderboards.`
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // =================================================
            // REPUTATION
            // =================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${symbols.reputation} Reputation\n` +
                    `Configure Staff and Funder roles, daily reputation ` +
                    `limits and reputation rewards.`
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // =================================================
            // LOGGING
            // =================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${symbols.settings} ASTER Logging\n` +
                    `Configure the channel where ASTER sends audit and ` +
                    `system activity logs.\n\n` +
                    `**Log channel:** ${loggingStatus}`
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // =================================================
            // AUTOMATION
            // =================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${symbols.automation} Automation\n` +
                    `Manage ASTER automation systems such as ` +
                    `autoresponders and autoreactions.`
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // =================================================
            // ACCESS
            // =================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${symbols.lock} Configuration Access\n` +
                    `Select a section below to open its settings.\n\n` +
                    `Only members with **Administrator** permission can ` +
                    `modify server configuration.`
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // =================================================
            // FOOTER
            // =================================================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# ${symbols.time} ASTER configuration panel\n` +
                    `-# ${symbols.brand} Changes affect this server only\n` +
                    `-# ${symbols.time} ${timestamps.now()}`
                )
            );

        // ====================================================
        // BUTTON ROW 1
        // ====================================================

        const row1 = new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("config_leaderboard")
                    .setLabel("Leaderboards")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("config_roles")
                    .setLabel("Reward Roles")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("config_rep")
                    .setLabel("Reputation")
                    .setStyle(ButtonStyle.Success)
            );

        // ====================================================
        // BUTTON ROW 2
        // ====================================================

        const row2 = new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("config_logging")
                    .setLabel("Logging")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("config_automation")
                    .setLabel("Automation")
                    .setStyle(ButtonStyle.Secondary)
            );

        // ====================================================
        // SEND
        // ====================================================

        return message.channel.send({
            components: [
                container,
                row1,
                row2
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
};