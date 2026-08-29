const {
    EmbedBuilder
} = require("discord.js");

// ========================================================
// ASTER UI
// ========================================================

const symbols = require("./asterUI/symbols");
const styles = require("./asterUI/styles");
const timestamps = require("./asterUI/timestamps");

// ========================================================
// ASTER LOGGER
// Centralized ASTER audit / system logging
// ========================================================

class AsterLogger {

    constructor() {
        this.client = null;
        this.guildId = null;
        this.channelId = null;
    }

    // ====================================================
    // INITIALIZE
    // ====================================================

    init(client, guildId, channelId) {

        this.client = client;
        this.guildId = guildId;
        this.channelId = channelId;

        console.log(
            `${symbols.brand} ASTER Logger initialized`
        );
    }

    // ====================================================
    // GET CHANNEL
    // ====================================================

    async getChannel() {

        if (!this.client || !this.channelId) {
            return null;
        }

        return this.client.channels
            .fetch(this.channelId)
            .catch(() => null);
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

                let formatted =
                    String(value);

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
            // Channel
            // ------------------------------------------------

            const channel =
                await this.getChannel();

            if (!channel) {
                return;
            }

            // ------------------------------------------------
            // Actor
            // ------------------------------------------------

            const actor =
                user
                    ? `${user.tag || user.username || "Unknown"} (${user.id})`
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
            // Details field
            // ------------------------------------------------

            if (detailText) {

                embed.addFields({
                    name: `${styles.headers.section} Details`,
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
        action,
        description,
        details = {}
    ) {

        return this.log({
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
        action,
        description,
        user,
        details = {}
    ) {

        return this.log({
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
        action,
        description,
        user,
        details = {}
    ) {

        return this.log({
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
        action,
        description,
        user,
        details = {}
    ) {

        return this.log({
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
        action,
        description,
        user,
        details = {}
    ) {

        return this.log({
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
        action,
        description,
        user,
        details = {}
    ) {

        return this.log({
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
        action,
        description,
        details = {}
    ) {

        return this.log({
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
        action,
        description,
        details = {}
    ) {

        return this.log({
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
// EXPORT SINGLE LOGGER INSTANCE
// ========================================================

module.exports = new AsterLogger();