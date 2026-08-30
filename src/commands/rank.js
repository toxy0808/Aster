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

    async execute(message, args) {

        // ========================================================
        // TARGET MEMBER
        // ========================================================

        const target =
            message.mentions.users.first() ||
            message.author;

        // ========================================================
        // USER DATA
        // ========================================================

        const user = db.prepare(
            "SELECT * FROM users WHERE user_id = ?"
        ).get(target.id);

        if (!user) {
            return message.reply(
                `${symbols.error} No rank data found for **${target.username}**.`
            );
        }

        // ========================================================
        // MEMBER INTELLIGENCE
        // ========================================================

        const intelligence = getMemberIntelligence(
            message.guild.id,
            target.id
        );

        // ========================================================
        // CHAT ACTIVITY
        // ========================================================

        const messages = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM activity_logs
            WHERE user_id = ?
            AND type = 'chat'
        `).get(target.id).total;

        // ========================================================
        // VOICE ACTIVITY
        // ========================================================

        const voice = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM activity_logs
            WHERE user_id = ?
            AND type = 'voice'
        `).get(target.id).total;

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

        const currentXP =
            Number(xpData.currentXP || 0);

        const nextXP =
            Number(xpData.neededXP || 0);

        // ========================================================
        // XP PROGRESS
        // ========================================================

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
                    presence = "Do Not Disturb";
                    break;

                default:
                    presence = "Offline";
            }
        }

        // ========================================================
        // ROLES
        // ========================================================

        const roles =
            member
                ? member.roles.cache
                    .filter(role => role.id !== message.guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(role => `<@&${role.id}>`)
                    .slice(0, 8)
                : [];

        const roleText =
            roles.length
                ? roles.join(" ")
                : "No roles";

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
        // ACCOUNT AGE
        // ========================================================

        const accountAgeDays =
            Math.floor(
                (Date.now() - target.createdTimestamp) /
                86400000
            );

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
                `-# Activity, progression and member analytics`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // MEMBER IDENTITY
        // ========================================================

        container.addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### ${symbols.user} ${target.username}\n` +
                        `\`${target.id}\`\n\n` +
                        `${symbols.online} ${presence}\n\n` +
                        `${symbols.level} Level **${user.level}**  •  ` +
                        `${symbols.rank} Rank **#${rank}**\n` +
                        `${symbols.reputation} Reputation **${
                            reputation >= 0
                                ? "+"
                                : ""
                        }${reputation}**`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder({
                        media: {
                            url: target.displayAvatarURL({
                                extension: "png",
                                size: 256
                            })
                        }
                    })
                )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // ACTIVITY INTELLIGENCE
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.activity} Activity Intelligence\n\n` +

                `**${symbols.chat} Messages**\n` +
                `${messages.toLocaleString()}\n\n` +

                `**${symbols.voice} Voice Activity**\n` +
                `${voice.toLocaleString()}\n\n` +

                `**${symbols.activity} Activity Score**\n` +
                `${intelligence.activityScore}/100 • ` +
                `**${intelligence.engagement}**`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // RECENT ACTIVITY
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.time} Recent Activity\n\n` +

                `**Last 7 Days**\n` +
                `${intelligence.recentActivity.toLocaleString()} activity units\n\n` +

                `**${symbols.chat} Chat Share**\n` +
                `${intelligence.chatPercentage}% of server chat\n\n` +

                `**${symbols.voice} Voice Share**\n` +
                `${intelligence.voicePercentage}% of server voice activity`
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
                `### ${symbols.level} Progression\n\n` +

                `**${symbols.level} Level**\n` +
                `${user.level}\n\n` +

                `**${symbols.xp} XP**\n` +
                `${currentXP.toLocaleString()} / ` +
                `${nextXP.toLocaleString()}\n` +

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
                `### ${symbols.user} Member Data\n\n` +

                `**${symbols.online} Presence**\n` +
                `${presence}\n\n` +

                `**${symbols.time} Joined Server**\n` +
                `${joinedAt}\n\n` +

                `**${symbols.time} Discord Account**\n` +
                `${createdAt}\n\n` +

                `**${symbols.time} Account Age**\n` +
                `${accountAgeDays.toLocaleString()} days`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // ROLES
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.staff} Member Roles\n\n` +
                roleText
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // INTELLIGENCE SUMMARY
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.activity} Intelligence Summary\n\n` +

                `${symbols.activity} Activity classification: ` +
                `**${intelligence.engagement}**\n` +

                `${symbols.activity} Activity score: ` +
                `**${intelligence.activityScore}/100**\n` +

                `${symbols.chat} **${messages.toLocaleString()}** ` +
                `messages recorded\n` +

                `${symbols.voice} **${voice.toLocaleString()}** ` +
                `voice activity recorded\n` +

                `${symbols.level} Currently **Level ${user.level}**\n` +

                `${symbols.rank} Activity ranking **#${rank}**\n` +

                `${symbols.reputation} Reputation score **${
                    reputation >= 0
                        ? "+"
                        : ""
                }${reputation}**`
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
                `-# ${symbols.brand} ASTER • Member Intelligence`
            )
        );

        // ========================================================
        // SEND
        // ========================================================

        return message.reply({
            components: [
                container
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
};