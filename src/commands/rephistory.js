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

        // =========================
        // HEADER
        // =========================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# 𝘼𝙎𝙏𝙀𝙍\n` +
                `### 𝙍𝙀𝙋  /  𝙃𝙄𝙎𝙏𝙊𝙍𝙔`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // =========================
        // NO ACTIVITY
        // =========================

        if (!logs.length) {

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ✦ 𝘼𝘾𝙏𝙄𝙑𝙄𝙏𝙔\n` +
                    `No reputation activity yet.`
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `> 𝙍𝙀𝙋 𝙎𝙔𝙎𝙏𝙀𝙈\n` +
                    `Your reputation history will appear here.`
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

        // =========================
        // HISTORY
        // =========================

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

            lines.push(
                `${direction}  **${amount} REP**  <@${otherUser}>  ·  <t:${timestamp}:R>`
            );
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### 𝙍𝙀𝘾𝙀𝙉𝙏 𝘼𝘾𝙏𝙄𝙑𝙄𝙏𝙔\n\n` +
                lines.join("\n")
            )
        );

        // =========================
        // STATISTICS
        // =========================

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
                `### 𝙍𝙀𝙋 𝙎𝙏𝘼𝙏𝙎\n\n` +
                `↑  **𝙂𝙄𝙑𝙀𝙉**  ·  **${totals.given || 0}**\n` +
                `↓  **𝙍𝙀𝘾𝙀𝙄𝙑𝙀𝘿**  ·  **${totals.received || 0}**`
            )
        );

        // =========================
        // FOOTER
        // =========================

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `> 𝘼𝙎𝙏𝙀𝙍  ·  𝙍𝙀𝙋𝙐𝙏𝘼𝙏𝙄𝙊𝙉 𝙎𝙔𝙎𝙏𝙀𝙈`
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