const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");

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

        // =========================
        // HEADER
        // =========================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "✨ **ASTER • REPUTATION LEADERBOARD**\n" +
                "🏆 *The most respected members of the community*"
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // =========================
        // EMPTY
        // =========================

        if (!users.length) {

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "📭 **No reputation yet.**\n" +
                    "Be the first to earn some reputation!"
                )
            );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // =========================
        // LEADERBOARD
        // =========================

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
                rank = `**#${i + 1}**`;
            }

            lines.push(
    `${rank} <@${user.user_id}>\n` +
    `> ⭐ **${user.reputation.toLocaleString()} Rep**`
);

            if (i < users.length - 1) {
                lines.push("");
            }
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                lines.join("\n")
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // =========================
        // FOOTER
        // =========================

        const myRep = db.prepare(`
            SELECT reputation
            FROM reputation
            WHERE user_id = ?
        `).get(message.author.id);

        const myReputation = myRep?.reputation ?? 0;

        const rankResult = db.prepare(`
            SELECT COUNT(*) + 1 AS rank
            FROM reputation
            WHERE reputation > ?
        `).get(myReputation);

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `💫 **Your Standing**\n` +
                `⭐ ${myReputation.toLocaleString()} Rep • ` +
                `🏅 Rank **#${rankResult.rank}**`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "💖 Keep contributing • Keep earning • Keep climbing"
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