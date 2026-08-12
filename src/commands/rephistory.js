const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
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

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `${EMOJI.aster}  **𝘼𝙎𝙏𝙀𝙍**  /  **𝙍𝙀𝙋**`
            )
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `${EMOJI.leaderboard}  **𝙇𝙀𝘼𝘿𝙀𝙍𝘽𝙊𝘼𝙍𝘿**`
            )
        );

        if (!users.length) {

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `${EMOJI.rep}  No reputation data yet.`
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
                `${rank}  <@${user.user_id}>  ·  **${user.reputation.toLocaleString()}**`
            );
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                lines.join("\n")
            )
        );

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

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `╭  ${EMOJI.rank}  **𝙔𝙊𝙐𝙍 𝙎𝙏𝘼𝙉𝘿𝙄𝙉𝙂**\n` +
                `│  **#${rankResult.rank}**  ·  ${myReputation.toLocaleString()} REP\n` +
                `╰  ${EMOJI.stats}  SERVER RANKING`
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