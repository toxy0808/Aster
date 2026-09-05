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
const { getXPData } = require("../utils/xp");

const {
    symbols,
    timestamps
} = require("../utils/asterUI");

const {
    getMemberIntelligence
} = require("../utils/memberIntelligence");

module.exports = {
    name: "rank",

    aliases: [
        "r",
        "profile"
    ],

    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("View a member's activity profile.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member to view.")
                .setRequired(false)
        ),

    async execute(message, args) {

        // ========================================================
        // TARGET
        // ========================================================

        const target =
            message.options?.getUser("user") ||
            message.mentions?.users?.first() ||
            message.author;

        // ========================================================
        // USER DATA
        // ========================================================

        const user = db.prepare(
            "SELECT * FROM users WHERE user_id = ?"
        ).get(target.id);

        if (!user) {
            return message.reply({
                content:
                    `${symbols.error} No rank data found for **${target.username}**.`,
                allowedMentions: {
                    parse: []
                }
            });
        }

        // ========================================================
        // INTELLIGENCE
        // ========================================================

        const intelligence = getMemberIntelligence(
            message.guild.id,
            target.id
        );

        // ========================================================
        // ACTIVITY
        // ========================================================

        const messages = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM activity_logs
            WHERE user_id = ?
            AND type = 'chat'
        `).get(target.id).total;

        const voice = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM activity_logs
            WHERE user_id = ?
            AND type = 'voice'
        `).get(target.id).total;

        // ========================================================
        // RANK
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

        const currentXP =
            Number(xpData.currentXP || 0);

        const nextXP =
            Number(xpData.neededXP || 0);

        const xpProgress =
            nextXP > 0
                ? Math.min(
                    100,
                    Math.floor(
                        (currentXP / nextXP) * 100
                    )
                )
                : 0;

        const totalBars = 10;

        const filledBars = Math.round(
            (xpProgress / 100) * totalBars
        );

        const xpBar =
            "▰".repeat(filledBars) +
            "▱".repeat(totalBars - filledBars);

        // ========================================================
        // REPUTATION
        // ========================================================

        const reputationRow = db.prepare(`
            SELECT reputation
            FROM reputation
            WHERE user_id = ?
        `).get(target.id);

        const reputation =
            reputationRow?.reputation || 0;

        // ========================================================
        // MEMBER
        // ========================================================

        const member =
            message.guild?.members.cache.get(target.id);

        // ========================================================
        // PRESENCE
        // ========================================================

        let presence = "Offline";

        if (member?.presence) {

            switch (member.presence.status) {

                case "online":
                    presence = "Online";
                    break;

                case "idle":
                    presence = "Idle";
                    break;

                case "dnd":
                    presence = "DND";
                    break;

                default:
                    presence = "Offline";
            }
        }

        // ========================================================
        // DATES
        // ========================================================

        const joinedAt =
            member?.joinedAt
                ? timestamps.longDate(member.joinedAt)
                : "Unknown";

        const createdAt =
            target.createdAt
                ? timestamps.longDate(target.createdAt)
                : "Unknown";

        // ========================================================
        // CONTAINER
        // ========================================================

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4FA3);

        // ========================================================
        // HEADER
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${symbols.user} ASTER / MEMBER INTELLIGENCE\n` +
                `-# Compact activity profile`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // IDENTITY
        // ========================================================

        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### ${symbols.user} ${target}\n` +
                        `\`${target.id}\`\n` +
                        `${symbols.online} ${presence}  •  ` +
                        `${symbols.level} Lv.${user.level}  •  ` +
                        `${symbols.rank} #${rank}\n` +
                        `${symbols.reputation} Rep ${reputation >= 0 ? "+" : ""}${reputation}`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder({
                        media: {
                            url: target.displayAvatarURL({
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
                `${symbols.chat} **${messages.toLocaleString()}** messages  •  ` +
                `${symbols.voice} **${voice.toLocaleString()}** voice\n` +
                `${symbols.activity} Score **${intelligence.activityScore}/100**  •  ` +
                `**${intelligence.engagement}**\n` +
                `${symbols.time} 7d: **${intelligence.recentActivity.toLocaleString()}** units`
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
                `Level **${user.level}**  •  ` +
                `XP **${currentXP.toLocaleString()} / ${nextXP.toLocaleString()}**\n` +
                `${xpBar} **${xpProgress}%**`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // MEMBER DATA
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.user} Member Data\n` +
                `${symbols.online} **${presence}**\n` +
                `${symbols.time} Joined ${joinedAt}\n` +
                `${symbols.time} Account ${createdAt}`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // SERVER SHARE
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.activity} Server Share\n` +
                `${symbols.chat} Chat **${intelligence.chatPercentage}%**  •  ` +
                `${symbols.voice} Voice **${intelligence.voicePercentage}%**`
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
                `-# ${symbols.time} Updated ${timestamps.now()}  •  ` +
                `${symbols.brand} ASTER`
            )
        );

        // ========================================================
        // SEND
        // ========================================================

        return message.reply({
            components: [
                container
            ],
            flags: MessageFlags.IsComponentsV2,

            allowedMentions: {
                parse: []
            }
        });
    }
};