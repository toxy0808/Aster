const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");
const { symbols, timestamps } = require("../utils/asterUI");

module.exports = {
    name: "rephistory",
    aliases: ["reph", "rep-history"],

    async execute(message) {

        // ========================================================
        // FETCH HISTORY
        // ========================================================

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

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4FA3);

        // ========================================================
        // HEADER
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${symbols.history} ASTER / REP HISTORY\n` +
                `-# Your recent reputation activity`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // NO ACTIVITY
        // ========================================================

        if (!logs.length) {

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${symbols.info} No Activity\n` +
                    "No reputation activity yet."
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# ${symbols.brand} Your reputation history will appear here.`
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# ${symbols.time} Checked ${timestamps.now()}`
                )
            );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: []
                }
            });
        }

        // ========================================================
        // HISTORY
        // ========================================================

        const lines = [];

        for (const log of logs) {

            const received =
                log.receiver_id === message.author.id;

            const direction =
                received
                    ? "↑"
                    : "↓";

            const amount =
                received
                    ? "+1"
                    : "−1";

            const otherUser =
                received
                    ? log.giver_id
                    : log.receiver_id;

            const timestamp =
                Math.floor(
                    new Date(log.created_at).getTime() / 1000
                );

            const symbol =
                received
                    ? symbols.positive
                    : symbols.negative;

            lines.push(
                `${direction} ${symbol} **${amount} REP**  <@${otherUser}>  ·  <t:${timestamp}:R>`
            );
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.history} Recent Activity\n\n` +
                lines.join("\n")
            )
        );

        // ========================================================
        // STATISTICS
        // ========================================================

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

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.stats} REP Statistics\n\n` +
                `${symbols.positive} **Given**  ·  **${totals.given || 0}**\n` +
                `${symbols.positive} **Received**  ·  **${totals.received || 0}**`
            )
        );

        // ========================================================
        // FOOTER
        // ========================================================

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${symbols.time} Updated ${timestamps.now()}\n` +
                `-# ${symbols.brand} ASTER • Reputation System`
            )
        );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: {
                parse: []
            }
        });
    }
};