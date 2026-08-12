const {
    EmbedBuilder
} = require("discord.js");

const db = require("../database/database");

const EMOJI = {
    aster: "<a:pinkogniK:1537116042466164868>",
    rep: "<a:Arrow_setupxD:1537115995171459103>",
    up: "<a:auraup:1537116075106508892>",
    down: "<a:4w_PinkArrowDown:1537716113899491358>",
    history: "<a:brownclock:1537116208435040388>",
    stats: "<a:795108partykillerpenguin:1537116231067377734>"
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

        const embed = new EmbedBuilder()
            .setColor(0xFF4FA3)
            .setAuthor({
                name: "ASTER  /  REP",
                iconURL: message.client.user.displayAvatarURL({
                    extension: "png",
                    size: 128
                })
            })
            .setTitle(`${EMOJI.history}  REPUTATION HISTORY`)
            .setDescription(
                `Recent reputation activity for **${message.author.username}**`
            )
            .setTimestamp();

        if (!logs.length) {

            embed.addFields({
                name: `${EMOJI.rep}  ACTIVITY`,
                value: "No reputation activity yet.",
                inline: false
            });

            embed.setFooter({
                text: "ASTER • Reputation System"
            });

            return message.reply({
                embeds: [embed],
                allowedMentions: {
                    parse: []
                }
            });
        }

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
                `${actionEmoji}  **${direction}1 REP**  <@${otherUser}>  ·  <t:${timestamp}:R>`
            );
        }

        embed.addFields({
            name: `${EMOJI.history}  RECENT ACTIVITY`,
            value: lines.join("\n"),
            inline: false
        });

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

        embed.addFields({
            name: `${EMOJI.stats}  REP STATISTICS`,
            value:
                `${EMOJI.up}  **GIVEN**  \`${totals.given || 0}\`\n` +
                `${EMOJI.down}  **RECEIVED**  \`${totals.received || 0}\``,
            inline: false
        });

        embed.setFooter({
            text: "ASTER • Reputation System"
        });

        return message.reply({
            embeds: [embed],
            allowedMentions: {
                parse: []
            }
        });
    }
};