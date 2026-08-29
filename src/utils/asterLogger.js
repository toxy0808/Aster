const {
    EmbedBuilder
} = require("discord.js");

const db = require("../database");

// ========================================================
// ASTER LOGGER
// Central audit / system logging
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
            "✦ ASTER Logger initialized"
        );
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
        color = "#FF4DA6"
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
            // No Discord channel configured
            // ------------------------------------------------

            if (
                !this.client ||
                !this.channelId
            ) {
                return;
            }

            // ------------------------------------------------
            // Get channel
            // ------------------------------------------------

            const channel =
                await this.client.channels
                    .fetch(this.channelId)
                    .catch(() => null);

            if (!channel) {

                console.warn(
                    `✕ ASTER Logger: channel ${this.channelId} not found`
                );

                return;
            }

            // ------------------------------------------------
            // Details
            // ------------------------------------------------

            let detailText = "";

            const entries =
                Object.entries(details);

            if (entries.length) {

                detailText =
                    entries
                        .map(([key, value]) => {

                            let formatted =
                                String(value);

                            if (
                                formatted.length > 1024
                            ) {
                                formatted =
                                    formatted.slice(
                                        0,
                                        1021
                                    ) + "...";
                            }

                            return `**${key}**\n${formatted}`;
                        })
                        .join("\n\n");
            }

            // ------------------------------------------------
            // User
            // ------------------------------------------------

            const userText =
                user
                    ? `${user.tag || user.username} (${user.id})`
                    : "ASTER System";

            // ------------------------------------------------
            // Embed
            // ------------------------------------------------

            const embed =
                new EmbedBuilder()
                    .setColor(color)
                    .setTitle(
                        `✦ ASTER / ${type.toUpperCase()}`
                    )
                    .setDescription(
                        `**${action}**\n${description || "No description provided."}`
                    )
                    .addFields({
                        name: "Actor",
                        value: userText,
                        inline: true
                    });

            if (detailText) {

                embed.addFields({
                    name: "Details",
                    value: detailText
                });
            }

            embed.setTimestamp();

            // ------------------------------------------------
            // Send
            // ------------------------------------------------

            await channel.send({
                embeds: [embed]
            });

        } catch (error) {

            console.error(
                "✕ ASTER Logger failed:",
                error
            );
        }
    }

    // ====================================================
    // SYSTEM
    // ====================================================

    system(action, description, details = {}) {

        return this.log({
            type: "system",
            action,
            description,
            details,
            color: "#FF4DA6"
        });
    }

    // ====================================================
    // CONFIGURATION
    // ====================================================

    config(action, description, user, details = {}) {

        return this.log({
            type: "configuration",
            action,
            description,
            user,
            details,
            color: "#9B59FF"
        });
    }

    // ====================================================
    // AUTOMATION
    // ====================================================

    automation(action, description, user, details = {}) {

        return this.log({
            type: "automation",
            action,
            description,
            user,
            details,
            color: "#FF4DA6"
        });
    }

    // ====================================================
    // MODERATION
    // ====================================================

    moderation(action, description, user, details = {}) {

        return this.log({
            type: "moderation",
            action,
            description,
            user,
            details,
            color: "#FF4D6D"
        });
    }

    // ====================================================
    // ERROR
    // ====================================================

    error(action, description, details = {}) {

        return this.log({
            type: "error",
            action,
            description,
            details,
            color: "#FF3B30"
        });
    }

}

module.exports = new AsterLogger();