const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");

module.exports = {
    name: "rephistory",
    aliases: ["reph", "rep-history"],

    async execute(message) {

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

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "**ASTER**\n" +
                "REPUTATION HISTORY"
            )
        );

        if (!logs.length) {

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "No reputation activity yet."
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

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        const lines = [];

        for (const log of logs) {

            const positive = log.type === "positive";

            const direction =
                log.receiver_id === message.author.id
                    ? "+"
                    : "-";

            const otherUser =
                log.receiver_id === message.author.id
                    ? log.giver_id
                    : log.receiver_id;

            const time = `<t:${Math.floor(
                new Date(log.created_at).getTime() / 1000
            )}:R>`;

            lines.push(
                `**${direction}1**  <@${otherUser}>  ·  ${time}`
            );
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                lines.join("\n")
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        const totals = db.prepare(`
            SELECT
                SUM(
                    CASE
                        WHEN receiver_id = ? AND type = 'positive'
                        THEN 1
                        ELSE 0
                    END
                ) AS received,
                SUM(
                    CASE
                        WHEN giver_id = ? AND type = 'positive'
                        THEN 1
                        ELSE 0
                    END
                ) AS given
            FROM reputation_logs
        `).get(
            message.author.id,
            message.author.id
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**GIVEN** ${totals.given || 0}  ·  ` +
                `**RECEIVED** ${totals.received || 0}`
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