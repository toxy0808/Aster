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
        // MEMBER
        // ========================================================

        const member = message.member;
        const targetUser = message.author;

        // ========================================================
        // USER DATA
        // ========================================================

        const user = db.prepare(`
            SELECT *
            FROM users
            WHERE user_id = ?
        `).get(targetUser.id);

        if (!user) {
            return message.reply(
                `${symbols.error} No rank data found for this member.`
            );
        }

        // ========================================================
        // TOTAL CHAT ACTIVITY
        // ========================================================

        const messages = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM activity_logs
            WHERE user_id = ?
            AND type = 'chat'
        `).get(targetUser.id).total;

        // ========================================================
        // TOTAL VOICE ACTIVITY
        // ========================================================

        let voiceTime = 0;

        try {

            const voiceData = db.prepare(`
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM activity_logs
                WHERE user_id = ?
                AND type = 'voice'
            `).get(targetUser.id);

            voiceTime = Number(voiceData?.total || 0);

        } catch {

            voiceTime = Number(user.voice_time || 0);

        }

        // ========================================================
        // RECENT ACTIVITY
        // ========================================================

        const nowUnix = Math.floor(Date.now() / 1000);

        const last24h = nowUnix - (24 * 60 * 60);
        const last7d = nowUnix - (7 * 24 * 60 * 60);

        // --------------------------------------------------------
        // 24H CHAT
        // --------------------------------------------------------

        const chat24h = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM activity_logs
            WHERE user_id = ?
            AND type = 'chat'
            AND CAST(created_at AS INTEGER) >= ?
        `).get(
            targetUser.id,
            last24h
        ).total;

        // --------------------------------------------------------
        // 7D CHAT
        // --------------------------------------------------------

        const chat7d = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM activity_logs
            WHERE user_id = ?
            AND type = 'chat'
            AND CAST(created_at AS INTEGER) >= ?
        `).get(
            targetUser.id,
            last7d
        ).total;

        // --------------------------------------------------------
        // 24H VOICE
        // --------------------------------------------------------

        let voice24h = 0;

        try {

            voice24h = db.prepare(`
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM activity_logs
                WHERE user_id = ?
                AND type = 'voice'
                AND CAST(created_at AS INTEGER) >= ?
            `).get(
                targetUser.id,
                last24h
            ).total || 0;

        } catch {}

        // --------------------------------------------------------
        // 7D VOICE
        // --------------------------------------------------------

        let voice7d = 0;

        try {

            voice7d = db.prepare(`
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM activity_logs
                WHERE user_id = ?
                AND type = 'voice'
                AND CAST(created_at AS INTEGER) >= ?
            `).get(
                targetUser.id,
                last7d
            ).total || 0;

        } catch {}

        // ========================================================
        // VOICE FORMATTER
        // ========================================================

        function formatVoiceTime(seconds) {

            seconds = Number(seconds || 0);

            if (seconds <= 0) {
                return "0m";
            }

            const totalMinutes =
                Math.floor(seconds / 60);

            const days =
                Math.floor(totalMinutes / 1440);

            const hours =
                Math.floor(
                    (totalMinutes % 1440) / 60
                );

            const minutes =
                totalMinutes % 60;

            const parts = [];

            if (days > 0) {
                parts.push(`${days}d`);
            }

            if (hours > 0) {
                parts.push(`${hours}h`);
            }

            if (
                minutes > 0 ||
                parts.length === 0
            ) {
                parts.push(`${minutes}m`);
            }

            return parts.join(" ");
        }

        // ========================================================
        // ACTIVITY RANK
        // ========================================================

        const rank = db.prepare(`
            SELECT COUNT(*) + 1 AS rank
            FROM (
                SELECT
                    user_id,
                    SUM(amount) AS messages
                FROM activity_logs
                WHERE type = 'chat'
                GROUP BY user_id
            )
            WHERE messages > ?
        `).get(messages).rank;

        // ========================================================
        // VOICE RANK
        // ========================================================

        let voiceRank = 0;

        try {

            voiceRank = db.prepare(`
                SELECT COUNT(*) + 1 AS rank
                FROM (
                    SELECT
                        user_id,
                        SUM(amount) AS voice_time
                    FROM activity_logs
                    WHERE type = 'voice'
                    GROUP BY user_id
                )
                WHERE voice_time > ?
            `).get(voiceTime).rank;

        } catch {}

        // ========================================================
        // XP / LEVEL
        // ========================================================

        const xpData = getXPData(user);

        const currentXP =
            Number(xpData?.currentXP || 0);

        const nextXP =
            Number(xpData?.neededXP || 0);

        const level =
            Number(user.level || 1);

        // ========================================================
        // REPUTATION
        // ========================================================

        let reputation = 0;

        try {

            const repData = db.prepare(`
                SELECT reputation
                FROM reputation
                WHERE user_id = ?
            `).get(targetUser.id);

            reputation =
                Number(repData?.reputation || 0);

        } catch {}

        // ========================================================
        // ACTIVITY TREND
        // ========================================================

        /*
         * Compare the average daily chat activity over the
         * last 7 days against the last 24 hours.
         */

        const averageDailyChat =
            Number(chat7d || 0) / 7;

        let trend = `${symbols.pending} Stable`;

        if (averageDailyChat > 0) {

            const ratio =
                Number(chat24h || 0) /
                averageDailyChat;

            if (ratio >= 1.35) {
                trend = `${symbols.positive} Increasing`;
            } else if (ratio <= 0.65) {
                trend = `${symbols.negative} Decreasing`;
            } else {
                trend = `${symbols.pending} Stable`;
            }
        } else if (chat24h > 0) {

            trend = `${symbols.positive} Increasing`;
        }

        // ========================================================
        // CHAT / VOICE BALANCE
        // ========================================================

        const chatActivity =
            Number(chat7d || 0);

        const voiceActivityHours =
            Number(voice7d || 0) / 3600;

        let balance = "Balanced";

        if (
            chatActivity > 0 &&
            voiceActivityHours > 0
        ) {

            const ratio =
                chatActivity /
                voiceActivityHours;

            if (ratio >= 15) {
                balance = "Chat focused";
            } else if (ratio <= 2) {
                balance = "Voice focused";
            }
        } else if (chatActivity > 0) {

            balance = "Chat focused";

        } else if (voiceActivityHours > 0) {

            balance = "Voice focused";
        }

        // ========================================================
        // ENGAGEMENT LEVEL
        // ========================================================

        let engagement = "Low";

        const engagementScore =
            Math.min(
                100,
                Math.floor(
                    Math.min(Number(chat7d) / 5, 40) +
                    Math.min(Number(voice7d) / 3600 * 5, 30) +
                    Math.min(
                        Math.max(reputation, 0) / 5,
                        20
                    ) +
                    Math.min(level, 10)
                )
            );

        if (engagementScore >= 80) {
            engagement = "Elite";
        } else if (engagementScore >= 60) {
            engagement = "High";
        } else if (engagementScore >= 30) {
            engagement = "Moderate";
        }

        // ========================================================
        // MEMBER ROLES
        // ========================================================

        let roleText = "No roles";

        if (member?.roles?.cache) {

            const roles = member.roles.cache
                .filter(
                    role => role.id !== message.guild.id
                )
                .sort(
                    (a, b) => b.position - a.position
                )
                .map(
                    role => `<@&${role.id}>`
                );

            if (roles.length) {

                roleText =
                    roles.slice(0, 8).join(" ");

                if (roles.length > 8) {
                    roleText +=
                        ` +${roles.length - 8} more`;
                }
            }
        }

        // ========================================================
        // MEMBER STATUS
        // ========================================================

        let status =
            `${symbols.offline} Offline`;

        if (member?.presence?.status) {

            const presence =
                member.presence.status;

            const statusMap = {

                online:
                    `${symbols.online} Online`,

                idle:
                    `${symbols.warning} Idle`,

                dnd:
                    `${symbols.error} Do Not Disturb`,

                offline:
                    `${symbols.offline} Offline`
            };

            status =
                statusMap[presence] ||
                `${symbols.offline} Offline`;
        }

        // ========================================================
        // STAFF DETECTION
        // ========================================================

        const isStaff =
            member?.permissions?.has("Administrator") ||
            member?.permissions?.has("ManageGuild") ||
            member?.permissions?.has("ModerateMembers");

        const memberType = isStaff
            ? `${symbols.staff} Staff`
            : `${symbols.user} Member`;

        // ========================================================
        // ACCOUNT / JOIN DATES
        // ========================================================

        const createdAt =
            targetUser.createdAt;

        const joinedAt =
            member?.joinedAt || null;

        // ========================================================
        // ACTIVITY INDEX
        // ========================================================

        const intelligenceScore =
            Math.min(
                100,
                Math.floor(
                    Math.min(Number(messages) / 10, 40) +
                    Math.min(Number(voiceTime) / 3600, 30) +
                    Math.min(
                        Math.max(reputation, 0) / 2,
                        20
                    ) +
                    Math.min(level, 10)
                )
            );

        // ========================================================
        // ASTER CONTAINER
        // ========================================================

        const container =
            new ContainerBuilder()
                .setAccentColor(0xFF4FA3);

        // ========================================================
        // HEADER
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${symbols.user} ASTER / MEMBER INTELLIGENCE\n` +
                `-# Activity, engagement and progression analysis`
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
                        `### ${symbols.user} ${targetUser.username}\n` +
                        `${memberType}  •  ${status}\n` +
                        `${symbols.rank} Activity Rank **#${rank}**`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder({
                        media: {
                            url:
                                targetUser.displayAvatarURL({
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
        // RECENT ACTIVITY
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.activity} Recent Activity\n\n` +

                `**${symbols.time} Last 24 Hours**\n` +
                `${symbols.chat} ${Number(chat24h).toLocaleString()} messages  •  ` +
                `${symbols.voice} ${formatVoiceTime(voice24h)} voice\n\n` +

                `**${symbols.time} Last 7 Days**\n` +
                `${symbols.chat} ${Number(chat7d).toLocaleString()} messages  •  ` +
                `${symbols.voice} ${formatVoiceTime(voice7d)} voice\n\n` +

                `**${symbols.refresh} Trend**\n` +
                `${trend}`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // ENGAGEMENT INTELLIGENCE
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.brand} Engagement Intelligence\n\n` +

                `**${symbols.activity} Engagement**\n` +
                `${engagement}  •  Score **${engagementScore}/100**\n\n` +

                `**${symbols.chat} / ${symbols.voice} Activity Balance**\n` +
                `${balance}\n\n` +

                `**${symbols.brand} Activity Index**\n` +
                `${intelligenceScore}/100`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // TOTAL ACTIVITY
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.activity} Lifetime Activity\n\n` +

                `**${symbols.chat} Messages**\n` +
                `${Number(messages).toLocaleString()}  •  ` +
                `Rank **#${rank}**\n\n` +

                `**${symbols.voice} Voice Time**\n` +
                `${formatVoiceTime(voiceTime)}` +
                (
                    voiceRank > 0
                        ? `  •  Rank **#${voiceRank}**`
                        : ""
                ) + `\n\n` +

                `**${symbols.reputation} Reputation**\n` +
                `${reputation >= 0 ? "+" : ""}` +
                `${reputation.toLocaleString()}`
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
                `${level}\n\n` +

                `**${symbols.xp} XP**\n` +
                `${currentXP.toLocaleString()} / ` +
                `${nextXP.toLocaleString()}`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // SERVER INTELLIGENCE
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.section} Server Intelligence\n\n` +

                `**${symbols.user} Member Type**\n` +
                `${memberType}\n\n` +

                `**${symbols.online} Presence**\n` +
                `${status}\n\n` +

                `**${symbols.staff} Roles**\n` +
                `${roleText}`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // MEMBER TIMELINE
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.time} Member Timeline\n\n` +

                `**Account Created**\n` +
                `${timestamps.fullDateTime(createdAt)}\n\n` +

                `**Joined Server**\n` +
                (
                    joinedAt
                        ? timestamps.fullDateTime(joinedAt)
                        : "Unknown"
                )
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
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};