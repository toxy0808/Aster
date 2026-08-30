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
        // MESSAGE COUNT
        // ========================================================

        const messages = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM activity_logs
            WHERE user_id = ?
            AND type = 'chat'
        `).get(targetUser.id).total;

        // ========================================================
        // VOICE ACTIVITY
        // ========================================================

        let voiceTime = 0;

        try {
            const voiceData = db.prepare(`
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM activity_logs
                WHERE user_id = ?
                AND type = 'voice'
            `).get(targetUser.id);

            voiceTime = voiceData?.total || 0;

        } catch {
            voiceTime = user.voice_time || 0;
        }

        // ========================================================
        // FORMAT VOICE TIME
        // ========================================================

        function formatVoiceTime(seconds) {

            if (!seconds || seconds <= 0) {
                return "0m";
            }

            const totalMinutes = Math.floor(seconds / 60);

            const days = Math.floor(totalMinutes / 1440);
            const hours = Math.floor(
                (totalMinutes % 1440) / 60
            );
            const minutes = totalMinutes % 60;

            const parts = [];

            if (days > 0) {
                parts.push(`${days}d`);
            }

            if (hours > 0) {
                parts.push(`${hours}h`);
            }

            if (minutes > 0 || parts.length === 0) {
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

        } catch {
            voiceRank = 0;
        }

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

        } catch {
            reputation = 0;
        }

        // ========================================================
        // MEMBER ROLES
        // ========================================================

        let roleText = "No roles";

        if (member?.roles?.cache) {

            const roles = member.roles.cache
                .filter(role => role.id !== message.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(role => `<@&${role.id}>`);

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

        let status = "Offline";

        if (member?.presence?.status) {

            const presence =
                member.presence.status;

            const statusMap = {
                online: `${symbols.online} Online`,
                idle: `${symbols.warning} Idle`,
                dnd: `${symbols.error} Do Not Disturb`,
                offline: `${symbols.offline} Offline`
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
        // INTELLIGENCE SCORE
        // ========================================================

        const intelligenceScore =
            Math.min(
                100,
                Math.floor(
                    Math.min(messages / 10, 40) +
                    Math.min(voiceTime / 3600, 30) +
                    Math.min(Math.max(reputation, 0) / 2, 20) +
                    Math.min(level, 10)
                )
            );

        // ========================================================
        // ASTER PROFILE CONTAINER
        // ========================================================

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4FA3);

        // ========================================================
        // HEADER
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${symbols.user} ASTER / MEMBER INTELLIGENCE\n` +
                `-# Activity, progression and server presence overview`
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
                        `### ${symbols.user} ${targetUser.username}\n` +
                        `${memberType}  •  ${status}\n` +
                        `${symbols.rank} Activity Rank **#${rank}**`
                    )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder({
                        media: {
                            url: targetUser.displayAvatarURL({
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
                `${messages.toLocaleString()}  •  Rank **#${rank}**\n\n` +

                `**${symbols.voice} Voice Activity**\n` +
                `${formatVoiceTime(voiceTime)}` +
                (
                    voiceRank > 0
                        ? `  •  Rank **#${voiceRank}**`
                        : ""
                ) + `\n\n` +

                `**${symbols.reputation} Reputation**\n` +
                `${reputation >= 0 ? "+" : ""}${reputation.toLocaleString()}`
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

                `**${symbols.brand} Activity Index**\n` +
                `${intelligenceScore}/100`
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
                `### ${symbols.staff} Roles\n` +
                `${roleText}`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // ACCOUNT INFORMATION
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