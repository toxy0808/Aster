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

const {
    symbols,
    timestamps
} = require("../utils/asterUI");

module.exports = {
    name: "repleaderboard",
    aliases: ["replb", "reputationlb"],

    async execute(message) {

        // ========================================================
        // FETCH TOP REP
        // ========================================================

        const users = db.prepare(`
            SELECT user_id, reputation
            FROM reputation
            WHERE reputation > 0
            ORDER BY reputation DESC
            LIMIT 10
        `).all();

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4FA3);

        // ========================================================
        // HEADER
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${EMOJI.leaderboard} ASTER / REP LEADERBOARD\n` +
                `-# Top reputation holders in the server`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // EMPTY STATE
        // ========================================================

        if (!users.length) {

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${EMOJI.rep} No Reputation Data\n` +
                    "There isn't any positive reputation data yet."
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# ${symbols.info} Start giving REP to populate the leaderboard.`
                )
            );

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

        // ========================================================
        // TOP 10
        // ========================================================

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

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${EMOJI.leaderboard} Top 10\n\n` +
                lines.join("\n")
            )
        );

        // ========================================================
        // PERSONAL STANDING
        // ========================================================

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
                `### ${EMOJI.rank} Your Standing\n` +
                `**#${rankResult.rank}**  ·  **${myReputation.toLocaleString()} REP**\n` +
                `${EMOJI.stats} Server Ranking`
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