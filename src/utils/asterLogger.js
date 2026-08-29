const {
    EmbedBuilder
} = require("discord.js");

const db = require("../database/database");
const { getConfig } = require("./serverConfig");

// ========================================================
// ASTER UI
// ========================================================

const symbols = require("./asterUI/symbols");
const styles = require("./asterUI/styles");
const timestamps = require("./asterUI/timestamps");

// ========================================================
// ASTER LOGGER
// Centralized audit / system logging
// ========================================================

class AsterLogger {

    constructor() {
        this.client = null;
    }

    // ====================================================
    // INITIALIZE
    // ====================================================

    init(client) {

        this.client = client;

        console.log(
            `${symbols.brand} ASTER Logger initialized`
        );
    }

    // ====================================================
    // GET LOG CHANNEL
    // ====================================================

    async getLogChannel(guildId) {

        if (!this.client || !guildId) {
            return null;
        }

        try {

            const config =
                getConfig(guildId);

            const channelId =
                config?.log_channel;

            if (!channelId) {
                return null;
            }

            const channel =
                await this.client.channels
                    .fetch(channelId)
                    .catch(() => null);

            return channel;

        } catch (error) {

            console.error(
                `${symbols.error} Failed to get ASTER log channel:`,
                error
            );

            return null;
        }
    }

    // ====================================================
    // BUILD DETAILS
    // ====================================================

    buildDetails(details = {}) {

        const entries =
            Object.entries(details);

        if (!entries.length) {
            return null;
        }

        return entries
            .map(([key, value]) => {

                let formatted;

                if (
                    value === null ||
                    value === undefined
                ) {
                    formatted = "None";
                } else if (
                    typeof value === "object"
                ) {
                    formatted =
                        JSON.stringify(
                            value,
                            null,
                            2
                        );
                } else {
                    formatted =
                        String(value);
                }

                if (formatted.length > 1024) {
                    formatted =
                        formatted.slice(0, 1021) + "...";
                }

                return `**${key}**\n${formatted}`;
            })
            .join("\n\n");
    }

    // ====================================================
    // LOG
    // ====================================================

    async log({
        guildId,
        type = "system",
        action = "Unknown Action",
        description = "",
        user = null,
        details = {},
        color = 0xFF4DA6,
        symbol = symbols.brand
    }) {

        try {

            // ------------------------------------------------
            // Console
            // ------------------------------------------------

            console.log(
                `[ASTER:${type.toUpperCase()}] ${action}`,
                details
            );

            // ------------------------------------------------
            // Guild
            // ------------------------------------------------

            if (!guildId) {
                return;
            }

            // ------------------------------------------------
            // Channel
            // ------------------------------------------------

            const channel =
                await this.getLogChannel(guildId);

            if (!channel) {
                return;
            }

            // ------------------------------------------------
            // Actor
            // ------------------------------------------------

            const actor =
                user
                    ? `<@${user.id}>`
                    : "ASTER System";

            // ------------------------------------------------
            // Details
            // ------------------------------------------------

            const detailText =
                this.buildDetails(details);

            // ------------------------------------------------
            // Embed
            // ------------------------------------------------

            const embed =
                new EmbedBuilder()
                    .setColor(color)
                    .setTitle(
                        `${styles.brand.symbol} ASTER / ${type.toUpperCase()}`
                    )
                    .setDescription(
                        `### ${symbol} ${action}\n` +
                        `${description || "-# No description provided."}`
                    )
                    .addFields({
                        name: `${symbols.user} Actor`,
                        value: actor,
                        inline: true
                    })
                    .addFields({
                        name: `${symbols.time} Time`,
                        value: timestamps.now(),
                        inline: true
                    });

            // ------------------------------------------------
            // Details
            // ------------------------------------------------

            if (detailText) {

                embed.addFields({
                    name:
                        `${styles.headers.section} Details`,
                    value: detailText
                });
            }

            // ------------------------------------------------
            // Footer
            // ------------------------------------------------

            embed.setFooter({
                text:
                    `${styles.brand.name} • Audit System`
            });

            // ------------------------------------------------
            // Send
            // ------------------------------------------------

            await channel.send({
                embeds: [embed]
            });

        } catch (error) {

            console.error(
                `${symbols.error} ASTER Logger failed:`,
                error
            );
        }
    }

    // ====================================================
    // SYSTEM
    // ====================================================

    system(
        guildId,
        action,
        description,
        details = {}
    ) {

        return this.log({
            guildId,
            type: "system",
            action,
            description,
            details,
            color: 0xFF4DA6,
            symbol: symbols.brand
        });
    }

    // ====================================================
    // CONFIGURATION
    // ====================================================

    config(
        guildId,
        action,
        description,
        user,
        details = {}
    ) {

        return this.log({
            guildId,
            type: "configuration",
            action,
            description,
            user,
            details,
            color: 0x9B59FF,
            symbol: symbols.settings
        });
    }

    // ====================================================
    // AUTOMATION
    // ====================================================

    automation(
        guildId,
        action,
        description,
        user,
        details = {}
    ) {

        return this.log({
            guildId,
            type: "automation",
            action,
            description,
            user,
            details,
            color: 0xFF4DA6,
            symbol: symbols.automation
        });
    }

    // ====================================================
    // AUTORESPONDER
    // ====================================================

    autoresponder(
        guildId,
        action,
        description,
        user,
        details = {}
    ) {

        return this.log({
            guildId,
            type: "autoresponder",
            action,
            description,
            user,
            details,
            color: 0xFF4DA6,
            symbol: symbols.autoresponder
        });
    }

    // ====================================================
    // AUTOREACT
    // ====================================================

    autoreact(
        guildId,
        action,
        description,
        user,
        details = {}
    ) {

        return this.log({
            guildId,
            type: "autoreact",
            action,
            description,
            user,
            details,
            color: 0xFF4DA6,
            symbol: symbols.autoreact
        });
    }

    // ====================================================
    // REPUTATION
    // ====================================================

    reputation(
        guildId,
        action,
        description,
        user,
        details = {}
    ) {

        return this.log({
            guildId,
            type: "reputation",
            action,
            description,
            user,
            details,
            color: 0xFF4DA6,
            symbol: symbols.reputation
        });
    }

    // ====================================================
    // LEADERBOARD
    // ====================================================

    leaderboard(
        guildId,
        action,
        description,
        details = {}
    ) {

        return this.log({
            guildId,
            type: "leaderboard",
            action,
            description,
            details,
            color: 0xFF4DA6,
            symbol: symbols.leaderboard
        });
    }

    // ====================================================
    // ERROR
    // ====================================================

    error(
        guildId,
        action,
        description,
        details = {}
    ) {

        return this.log({
            guildId,
            type: "error",
            action,
            description,
            details,
            color: 0xFF3B30,
            symbol: symbols.error
        });
    }
}

// ========================================================
// SINGLE LOGGER INSTANCE
// ========================================================

module.exports = new AsterLogger();