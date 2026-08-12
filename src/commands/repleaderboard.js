const {
    EmbedBuilder
} = require("discord.js");

const db = require("../database/database");

const EMOJI = {
    aster: "<a:pinkogniK:1537116042466164868>",
    rep: "<a:Arrow_setupxD:1537115995171459103>",
    leaderboard: "<a:va_red_crown:1537116142211047496>",
    rank: "<a:01x_diamond:1537116171185164388>",
    stats: "<a:795108partykillerpenguin:1537116231067377734>"
};

module.exports = {
    name: "repleaderboard",
    aliases: ["replb", "reputationlb"],

    async execute(message) {

        const users = db.prepare(`
            SELECT user_id, reputation
            FROM reputation
            WHERE reputation > 0
            ORDER BY reputation DESC
            LIMIT 10
        `).all();

        const embed = new EmbedBuilder()
            .setColor(0xFF4FA3)
            .setAuthor({
                name: "ASTER  /  REP",
                iconURL: message.client.user.displayAvatarURL({
                    extension: "png",
                    size: 128
                })
            })
            .setTitle(`${EMOJI.leaderboard}  REP LEADERBOARD`)
            .setDescription(
                `${EMOJI.rep}  **Top reputation holders in the server**`
            )
            .setTimestamp();

        if (!users.length) {

            embed.addFields({
                name: `${EMOJI.rep}  LEADERBOARD`,
                value: "No reputation data yet.",
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

        for (let i = 0; i < users.length; i++) {

            const user = users[i];

            let rank;

            if (i === 0) {
                rank = "🥇";
            } else if (i === 1) {
                rank = "🥈";
            } else if (i === 2) {
                rank = "🥉";
            } else {
                rank =
                    `**${String(i + 1).padStart(2, "0")}**`;
            }

            lines.push(
                `${rank}  <@${user.user_id}>  ·  **${user.reputation.toLocaleString()} REP**`
            );
        }

        embed.addFields({
            name: `${EMOJI.leaderboard}  TOP 10`,
            value: lines.join("\n"),
            inline: false
        });

        const myRep = db.prepare(`
            SELECT reputation
            FROM reputation
            WHERE user_id = ?
        `).get(message.author.id);

        const myReputation =
            myRep?.reputation ?? 0;

        const rankResult = db.prepare(`
            SELECT COUNT(*) + 1 AS rank
            FROM reputation
            WHERE reputation > ?
        `).get(myReputation);

        embed.addFields({
            name: `${EMOJI.rank}  YOUR STANDING`,
            value:
                `**#${rankResult.rank}**  ·  **${myReputation.toLocaleString()} REP**\n` +
                `${EMOJI.stats}  Server Ranking`,
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