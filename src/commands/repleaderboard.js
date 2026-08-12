const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");

const EMOJI = {
    aster: "<a:pinkogniK:139064268480008284>",
    rep: "<a:Arrow_setupxD:1371755199965954099>",
    up: "<a:auraup:1520369745583538307>",
    down: "<a:4w_PinkArrowDown:1386173879046639666>",
    history: "<a:brownclock:1413889485552484465>",
    stats: "<a:795108partykillerpenguin:1467048442395365437>"
};

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
                `${EMOJI.aster}  **𝘼𝙎𝙏𝙀𝙍**  /  **𝙍𝙀𝙋**`
            )
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `${EMOJI.history}  **𝙃𝙄𝙎𝙏𝙊𝙍𝙔**`
            )
        );

        if (!logs.length) {

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `${EMOJI.rep}  No reputation activity yet.`
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

            const received =
                log.receiver_id === message.author.id;

            const direction =
                received
                    ? "+"
                    : "−";

            const actionEmoji =
                received
                    ? EMOJI.up
                    : EMOJI.down;

            const otherUser =
                received
                    ? log.giver_id
                    : log.receiver_id;

            const timestamp =
                Math.floor(
                    new Date(log.created_at).getTime() / 1000
                );

            lines.push(
                `${actionEmoji}  **${direction}1**  <@${otherUser}>  ·  <t:${timestamp}:R>`
            );
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                lines.join("\n")
            )
        );

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
                `╭  ${EMOJI.stats}  **𝙍𝙀𝙋 𝙎𝙏𝘼𝙏𝙎**\n` +
                `│  ◈  GIVEN  **${totals.given || 0}**\n` +
                `│  ◇  RECEIVED  **${totals.received || 0}**\n` +
                `╰  ${EMOJI.rep}  ACTIVITY`
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