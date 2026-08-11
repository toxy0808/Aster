const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");
const { getXPData } = require("../utils/xp");

module.exports = {
    name: "rank",

    aliases: [
        "r",
        "profile"
    ],

    async execute(message, args) {

        // =========================
        // USER DATA
        // =========================

        const user = db.prepare(
            "SELECT * FROM users WHERE user_id = ?"
        ).get(message.author.id);

        if (!user) {
            return message.reply("No rank data found.");
        }


        // =========================
        // MESSAGE COUNT
        // =========================

        const messages = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM activity_logs
            WHERE user_id = ?
            AND type = 'chat'
        `).get(message.author.id).total;


        // =========================
        // ACTIVITY RANK
        // =========================

        const rank = db.prepare(`
            SELECT COUNT(*) + 1 AS rank
            FROM (
                SELECT user_id, SUM(amount) AS messages
                FROM activity_logs
                WHERE type = 'chat'
                GROUP BY user_id
            )
            WHERE messages > ?
        `).get(messages).rank;


        // =========================
        // XP
        // =========================

        const xpData = getXPData(user);

        const currentXP = xpData.currentXP;
        const nextXP = xpData.neededXP;


        // =========================
        // ASTER PROFILE
        // =========================

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "**ASTER / PROFILE**"
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // =========================
        // USER
        // =========================

        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**${message.author.username}**\n` +
                        `Level ${user.level} · Rank #${rank}`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder({
                        media: {
                            url: message.author.displayAvatarURL()
                        }
                    })
                )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // =========================
        // STATS
        // =========================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**MESSAGES**  ${messages.toLocaleString()}\n` +
                `**LEVEL**     ${user.level}\n` +
                `**XP**        ${currentXP.toLocaleString()} / ${nextXP.toLocaleString()}`
            )
        );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};