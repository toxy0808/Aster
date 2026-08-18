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
const { symbols, timestamps } = require("../utils/asterUI");

module.exports = {
    name: "rank",

    aliases: [
        "r",
        "profile"
    ],

    async execute(message, args) {

        // ========================================================
        // USER DATA
        // ========================================================

        const user = db.prepare(
            "SELECT * FROM users WHERE user_id = ?"
        ).get(message.author.id);

        if (!user) {
            return message.reply(
                `${symbols.error} No rank data found.`
            );
        }

        // ========================================================
        // MESSAGE COUNT
        // ========================================================

        const messages = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM activity_logs
            WHERE user_id = ?
            AND type = 'chat'
        `).get(message.author.id).total;

        // ========================================================
        // ACTIVITY RANK
        // ========================================================

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

        // ========================================================
        // XP
        // ========================================================

        const xpData = getXPData(user);

        const currentXP = xpData.currentXP;
        const nextXP = xpData.neededXP;

        // ========================================================
        // ASTER PROFILE
        // ========================================================

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4FA3);

        // ========================================================
        // HEADER
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${symbols.user} ASTER / PROFILE\n` +
                `-# Your activity and progression overview`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // USER
        // ========================================================

        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### ${symbols.user} ${message.author.username}\n` +
                        `${symbols.level} Level **${user.level}**  •  ` +
                        `${symbols.rank} Rank **#${rank}**`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder({
                        media: {
                            url: message.author.displayAvatarURL({
                                extension: "png",
                                size: 128
                            })
                        }
                    })
                )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // ACTIVITY
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.activity} Activity\n` +
                `**${symbols.chat} Messages**\n` +
                `${messages.toLocaleString()}`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // PROGRESSION
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.level} Progression\n` +
                `**${symbols.level} Level**\n` +
                `${user.level}\n\n` +
                `**${symbols.xp} XP**\n` +
                `${currentXP.toLocaleString()} / ${nextXP.toLocaleString()}`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // FOOTER
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${symbols.time} Updated ${timestamps.now()}\n` +
                `-# ${symbols.brand} ASTER • Activity Profile`
            )
        );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};