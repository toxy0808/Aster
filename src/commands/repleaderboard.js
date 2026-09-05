const {
    SlashCommandBuilder,
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
    name: "repleaderboard",
    aliases: ["replb", "reputationlb"],

    data: new SlashCommandBuilder()
        .setName("repleaderboard")
        .setDescription("View the server reputation leaderboard."),

    async execute(message) {

        // ====================================================
        // FETCH TOP 10
        // ====================================================

        const users = db.prepare(`
            SELECT user_id, reputation
            FROM reputation
            WHERE reputation > 0
            ORDER BY reputation DESC, user_id ASC
            LIMIT 10
        `).all();

        const components = [
            header(
                "ASTER / REP LEADERBOARD",
                styles.sections.leaderboard
            ),

            separator()
        ];

        // ====================================================
        // EMPTY STATE
        // ====================================================

        if (!users.length) {
            components.push(
                section(
                    "No Reputation Data",
                    "There isn't any positive reputation data yet.",
                    styles.status.info
                ),

                separator(),

                stat(
                    "Info",
                    "Start giving REP to populate the leaderboard.",
                    symbols.info
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

        // ====================================================
        // TOP 10
        // ====================================================

        const lines = users.map((user, index) => {

            let rank;

            if (index === 0) {
                rank = `${symbols.trophy} **01**`;
            } else if (index === 1) {
                rank = `${symbols.rank} **02**`;
            } else if (index === 2) {
                rank = `${symbols.rank} **03**`;
            } else {
                rank =
                    `**${String(index + 1).padStart(2, "0")}**`;
            }

            return (
                `${rank}  <@${user.user_id}>  ·  ` +
                `**${user.reputation.toLocaleString()} REP**`
            );
        });

        components.push(
            section(
                "Top 10",
                lines.join("\n"),
                styles.sections.leaderboard
            ),

            separator()
        );

        // ====================================================
        // PERSONAL STANDING
        // ====================================================

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

        components.push(
            section(
                "Your Standing",
                `**#${rankResult.rank}**  ·  **${myReputation.toLocaleString()} REP**`,
                styles.sections.rank
            ),

            separator(),

            stat(
                "Ranking",
                "Server Reputation Ranking",
                symbols.rank
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