const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
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
// Components V2 + ASTER UI
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

            if (!channel) {
                return null;
            }

            // Make sure this is a text-capable channel
            if (
                !channel.isTextBased ||
                !channel.isTextBased()
            ) {
                return null;
            }

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

                    try {

                        formatted =
                            JSON.stringify(
                                value,
                                null,
                                2
                            );

                    } catch {

                        formatted =
                            String(value);
                    }

                } else {

                    formatted =
                        String(value);
                }

                // Discord TextDisplay safety
                if (formatted.length > 1500) {

                    formatted =
                        formatted.slice(0, 1497) +
                        "...";
                }

                return (
                    `**${key}**\n` +
                    formatted
                );
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
            // CONSOLE
            // ------------------------------------------------

            console.log(
                `[ASTER:${type.toUpperCase()}] ${action}`,
                details
            );

            // ------------------------------------------------
            // GUILD
            // ------------------------------------------------

            if (!guildId) {
                return;
            }

            // ------------------------------------------------
            // CHANNEL
            // ------------------------------------------------

            const channel =
                await this.getLogChannel(guildId);

            if (!channel) {
                return;
            }

            // ------------------------------------------------
            // ACTOR
            // ------------------------------------------------

            const actor =
                user?.id
                    ? `<@${user.id}>`
                    : "ASTER System";

            // ------------------------------------------------
            // DETAILS
            // ------------------------------------------------

            const detailText =
                this.buildDetails(details);

            // ------------------------------------------------
            // TYPE LABEL
            // ------------------------------------------------

            const typeLabel =
                String(type)
                    .toUpperCase();

            // ------------------------------------------------
            // CONTAINER
            // ------------------------------------------------

            const container =
                new ContainerBuilder()
                    .setAccentColor(color);

            // ------------------------------------------------
            // HEADER
            // ------------------------------------------------

            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `# ${styles.brand.symbol} ASTER / ${typeLabel}\n` +
                        `### ${symbol} ${action}\n` +
                        `-# ${description || "No description provided."}`
                    )
            );

            // ------------------------------------------------
            // SEPARATOR
            // ------------------------------------------------

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            // ------------------------------------------------
            // ACTOR + TIME
            // ------------------------------------------------

            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `**${symbols.user} Actor**\n` +
                        `${actor}\n\n` +

                        `**${symbols.time} Time**\n` +
                        `${timestamps.now()}`
                    )
            );

            // ------------------------------------------------
            // DETAILS
            // ------------------------------------------------

            if (detailText) {

                container.addSeparatorComponents(
                    new SeparatorBuilder()
                );

                container.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            `### ${styles.headers.section} Details\n` +
                            detailText
                        )
                );
            }

            // ------------------------------------------------
            // FOOTER
            // ------------------------------------------------

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `-# ${styles.brand.symbol} ${styles.brand.name} • Audit System`
                    )
            );

            // ------------------------------------------------
            // SEND
            // ------------------------------------------------

            await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
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