const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");
const { getConfig } = require("./serverConfig");

const {
    symbols,
    styles
} = require("./asterUI");

// ========================================================
// THEME
// ========================================================

const ACCENT =
    styles?.colors?.accent ??
    styles?.theme?.colors?.accent ??
    0x7C5CFF;

// ========================================================
// LOGGER
// ========================================================

class AsterLogger {

    constructor() {
        this.client = null;
    }

    // ========================================================
    // INITIALIZE
    // ========================================================

    init(client) {
        this.client = client;

        console.log(
            `${symbols.brand} ASTER Logger initialized`
        );
    }

    // ========================================================
    // GET CONFIGURED LOG CHANNEL
    // ========================================================

    async getLogChannel(guildId) {

        if (!this.client || !guildId) {
            return null;
        }

        try {
            const config = getConfig(String(guildId));

            const channelId = config?.log_channel;

            if (!channelId) {
                return null;
            }

            const channel =
                await this.client.channels
                    .fetch(String(channelId))
                    .catch(() => null);

            if (!channel) {
                console.warn(
                    `[ASTER LOGGER] Configured log channel ${channelId} could not be found.`
                );

                return null;
            }

            if (
                typeof channel.isTextBased !== "function" ||
                !channel.isTextBased()
            ) {
                console.warn(
                    `[ASTER LOGGER] Configured log channel ${channelId} is not text based.`
                );

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

    // ========================================================
    // BUILD DETAILS
    // ========================================================

    buildDetails(details = {}) {

        const entries = Object.entries(details);

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

                } else if (typeof value === "object") {
                    try {
                        formatted = JSON.stringify(
                            value,
                            null,
                            2
                        );
                    } catch {
                        formatted = String(value);
                    }
                } else {
                    formatted = String(value);
                }

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

    // ========================================================
    // MAIN LOG FUNCTION
    // ========================================================

    async log({
        guildId,
        type = "system",
        action = "Unknown Action",
        description = "",
        user = null,
        details = {},
        color = ACCENT,
        symbol = symbols.brand
    }) {

        try {
            const normalizedGuildId =
                guildId
                    ? String(guildId)
                    : null;

            // ------------------------------------------------
            // ALWAYS CONSOLE LOG
            // ------------------------------------------------

            console.log(
                `[ASTER:${String(type).toUpperCase()}] ${action}`,
                details
            );

            if (!normalizedGuildId) {
                return false;
            }

            // ------------------------------------------------
            // GET CONFIGURED CHANNEL
            // ------------------------------------------------

            const channel =
                await this.getLogChannel(
                    normalizedGuildId
                );

            if (!channel) {
                return false;
            }

            // ------------------------------------------------
            // ACTOR
            // ------------------------------------------------

            let actor = "System";

            if (user) {
                if (user.id) {
                    actor =
                        user.tag ||
                        user.username ||
                        `<@${user.id}>`;
                } else {
                    actor = String(user);
                }
            }

            // ------------------------------------------------
            // DETAILS
            // ------------------------------------------------

            const detailText =
                this.buildDetails(details);

            // ------------------------------------------------
            // BUILD COMPONENT
            // ------------------------------------------------

            const container =
                new ContainerBuilder()
                    .setAccentColor(color)

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `# ${symbol} ASTER / ${String(type).toUpperCase()}\n` +
                                `### ${action}\n\n` +
                                `${description || "No description provided."}`
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `**Actor**\n${actor}`
                            )
                    );

            if (detailText) {
                container
                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(detailText)
                    );
            }

            // ------------------------------------------------
            // SEND
            // ------------------------------------------------

            await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: []
                }
            });

            return true;

        } catch (error) {
            console.error(
                `${symbols.error} ASTER logger failed:`,
                error
            );

            return false;
        }
    }

    // ========================================================
    // CONFIGURATION
    // ========================================================

    async config(
        guildId,
        action,
        description,
        user = null,
        details = {}
    ) {
        return this.log({
            guildId,
            type: "config",
            action,
            description,
            user,
            details,
            color: ACCENT,
            symbol: symbols.settings || symbols.brand
        });
    }

    // ========================================================
    // AUTORESPONDER
    // ========================================================

    async autoresponder(
        guildId,
        action,
        description,
        user = null,
        details = {}
    ) {
        return this.log({
            guildId,
            type: "autoresponder",
            action,
            description,
            user,
            details,
            color: ACCENT,
            symbol: symbols.autoresponder || symbols.brand
        });
    }

    // ========================================================
    // AUTOREACT
    // ========================================================

    async autoreact(
        guildId,
        action,
        description,
        user = null,
        details = {}
    ) {
        return this.log({
            guildId,
            type: "autoreact",
            action,
            description,
            user,
            details,
            color: ACCENT,
            symbol: symbols.autoreact || symbols.brand
        });
    }

    // ========================================================
    // REPUTATION
    // ========================================================

    async reputation(
        guildId,
        action,
        description,
        user = null,
        details = {}
    ) {
        return this.log({
            guildId,
            type: "reputation",
            action,
            description,
            user,
            details,
            color: ACCENT,
            symbol: symbols.reputation || symbols.brand
        });
    }

    // ========================================================
    // LEADERBOARD
    // ========================================================

    async leaderboard(
        guildId,
        action,
        description,
        user = null,
        details = {}
    ) {
        return this.log({
            guildId,
            type: "leaderboard",
            action,
            description,
            user,
            details,
            color: ACCENT,
            symbol: symbols.leaderboard || symbols.brand
        });
    }

    // ========================================================
    // SYSTEM
    // ========================================================

    async system(
        guildId,
        action,
        description,
        user = null,
        details = {}
    ) {
        return this.log({
            guildId,
            type: "system",
            action,
            description,
            user,
            details,
            color: ACCENT,
            symbol: symbols.brand
        });
    }

    // ========================================================
    // ERROR
    // ========================================================

    async error(
        guildId,
        action,
        description,
        user = null,
        details = {}
    ) {
        return this.log({
            guildId,
            type: "error",
            action,
            description,
            user,
            details,
            color: 0xFF4D6D,
            symbol: symbols.error || symbols.brand
        });
    }
}

module.exports =
    new AsterLogger();