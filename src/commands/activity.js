const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");
const { symbols, timestamps } = require("../utils/asterUI");

module.exports = {
    name: "activity",

    aliases: [
        "act",
        "stats"
    ],

    data: new SlashCommandBuilder()
        .setName("activity")
        .setDescription("View your activity statistics."),

    async execute(message, args) {

        const user = db.prepare(
            "SELECT * FROM users WHERE user_id = ?"
        ).get(message.author.id);

        const messages = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM activity_logs
            WHERE user_id = ?
            AND type = 'chat'
        `).get(message.author.id).total;

        const voice = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM activity_logs
            WHERE user_id = ?
            AND type = 'voice'
        `).get(message.author.id).total;

        if (!user) {
            return message.reply(
                `${symbols.error} No activity data found.`
            );
        }

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

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4FA3);

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${symbols.activity} ASTER / ACTIVITY\n` +
                `-# ${message.author.username}'s activity overview`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### ${symbols.user} ${message.author.username}\n` +
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

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.chat} Chat Activity\n` +
                `**Messages**\n` +
                `${messages.toLocaleString()}`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.voice} Voice Activity\n` +
                `**Voice Time**\n` +
                `${voice.toLocaleString()} minutes`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.level} Progression\n` +
                `**Level**\n` +
                `${user.level}`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${symbols.time} Updated ${timestamps.now()}\n` +
                `-# ${symbols.brand} ASTER • Activity System`
            )
        );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};