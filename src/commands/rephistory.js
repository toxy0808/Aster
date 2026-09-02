const {
    MessageFlags,
    ContainerBuilder
} = require("discord.js");

const db = require("../database/database");

const {
    symbols,
    timestamps,
    styles,
    header,
    section,
    stat,
    separator
} = require("../utils/asterUI");

// ========================================================
// COMPONENT BUILDER
// ========================================================

function buildContainer(...components) {
    const output = new ContainerBuilder();

    for (const component of components.flat()) {
        if (!component) continue;

        if (component.constructor?.name === "SeparatorBuilder") {
            output.addSeparatorComponents(component);
        } else {
            output.addTextDisplayComponents(component);
        }
    }

    return output;
}

// ========================================================
// COMMAND
// ========================================================

module.exports = {
    name: "rephistory",
    aliases: ["reph", "rep-history"],

    async execute(message) {

        // ====================================================
        // FETCH HISTORY
        // ====================================================

        const logs = db.prepare(`
            SELECT
                giver_id,
                receiver_id,
                type,
                created_at
            FROM reputation_logs
            WHERE giver_id = ?
               OR receiver_id = ?
            ORDER BY id DESC
            LIMIT 10
        `).all(
            message.author.id,
            message.author.id
        );

        const components = [
            header(
                "ASTER / REP HISTORY",
                styles.sections.reputation
            ),

            separator()
        ];

        // ====================================================
        // EMPTY STATE
        // ====================================================

        if (!logs.length) {
            components.push(
                section(
                    "No Activity",
                    "No reputation activity yet.",
                    styles.status.info
                ),

                separator(),

                stat(
                    "Info",
                    "Your reputation history will appear here.",
                    symbols.info
                ),

                separator(),

                stat(
                    "Checked",
                    timestamps.now(),
                    symbols.time
                ),

                stat(
                    "System",
                    `${styles.brand.name} • Reputation System`,
                    styles.brand.symbol
                )
            );

            const output = buildContainer(...components);

            return message.reply({
                components: [output],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: []
                }
            });
        }

        // ====================================================
        // HISTORY
        // ====================================================

        const lines = logs.map(log => {

            const received =
                log.receiver_id === message.author.id;

            const otherUser =
                received
                    ? log.giver_id
                    : log.receiver_id;

            const positive =
                log.type === "positive";

            // From the user's perspective:
            // received positive = +1
            // received negative = -1
            // gave positive = -1
            // gave negative = +1
            const amount =
                received
                    ? (positive ? "+1" : "−1")
                    : (positive ? "−1" : "+1");

            const direction =
                received
                    ? "↑"
                    : "↓";

            const symbol =
                positive
                    ? symbols.positive
                    : symbols.negative;

            const timestamp =
                typeof log.created_at === "number"
                    ? (
                        log.created_at > 1e12
                            ? log.created_at
                            : log.created_at * 1000
                    )
                    : new Date(
                        log.created_at
                    ).getTime();

            const time =
                Number.isFinite(timestamp)
                    ? timestamps.relative(timestamp)
                    : "unknown time";

            return (
                `${direction} ${symbol} **${amount} REP**  ` +
                `<@${otherUser}>  ·  ${time}`
            );
        });

        components.push(
            section(
                "Recent Activity",
                lines.join("\n"),
                styles.sections.reputation
            ),

            separator()
        );

        // ====================================================
        // STATISTICS
        // ====================================================

        const totals = db.prepare(`
            SELECT
                SUM(
                    CASE
                        WHEN receiver_id = ?
                        AND type = 'positive'
                        THEN 1
                        ELSE 0
                    END
                ) AS received,

                SUM(
                    CASE
                        WHEN giver_id = ?
                        AND type = 'positive'
                        THEN 1
                        ELSE 0
                    END
                ) AS given
            FROM reputation_logs
        `).get(
            message.author.id,
            message.author.id
        );

        components.push(
            section(
                "REP Statistics",
                `${symbols.positive} **Given**  ·  **${totals.given || 0}**\n` +
                `${symbols.positive} **Received**  ·  **${totals.received || 0}**`,
                styles.sections.reputation
            ),

            separator(),

            stat(
                "Updated",
                timestamps.now(),
                symbols.time
            ),

            stat(
                "System",
                `${styles.brand.name} • Reputation System`,
                styles.brand.symbol
            )
        );

        const output = buildContainer(...components);

        return message.reply({
            components: [output],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: {
                parse: []
            }
        });
    }
};