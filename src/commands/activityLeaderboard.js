const {
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
    name: "activitylb",

    aliases: [
        "actlb",
        "activityleaderboard"
    ],

    async execute(message) {

        // ========================================================
        // DATA
        // ========================================================

        function getChatTop24h() {
            const since =
                Math.floor(Date.now() / 1000) - 86400;

            return db.prepare(`
                SELECT
                    user_id,
                    SUM(amount) AS messages
                FROM activity_logs
                WHERE type = 'chat'
                AND created_at >= ?
                GROUP BY user_id
                ORDER BY messages DESC
                LIMIT 5
            `).all(since);
        }

        function getVoiceTop24h() {
            const since =
                Math.floor(Date.now() / 1000) - 86400;

            return db.prepare(`
                SELECT
                    user_id,
                    SUM(amount) AS voice_time
                FROM activity_logs
                WHERE type = 'voice'
                AND created_at >= ?
                GROUP BY user_id
                ORDER BY voice_time DESC
                LIMIT 5
            `).all(since);
        }

        async function addUserData(users) {

            return Promise.all(
                users.map(async (user) => {

                    const member =
                        await message.guild.members
                            .fetch(user.user_id)
                            .catch(() => null);

                    return {
                        ...user,

                        username: member
                            ? member.user.username
                            : "Unknown",

                        avatar: member
                            ? member.user.displayAvatarURL({
                                extension: "png",
                                size: 256
                            })
                            : null
                    };
                })
            );
        }

        const chat =
            await addUserData(
                getChatTop24h()
            );

        const voice =
            await addUserData(
                getVoiceTop24h()
            );

        // ========================================================
        // HELPERS
        // ========================================================

        function formatVoice(minutes) {

            minutes = Number(minutes) || 0;

            const hours =
                Math.floor(minutes / 60);

            const mins =
                minutes % 60;

            if (hours > 0) {
                return `${hours}h ${mins}m`;
            }

            return `${mins}m`;
        }

        const ranks = [
            "🥇",
            "🥈",
            "🥉",
            "④",
            "⑤"
        ];

        // ========================================================
        // CONTAINER
        // ========================================================

        const container =
            new ContainerBuilder()
                .setAccentColor(0xFF4FA3);

        // ========================================================
        // HEADER
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${symbols.activity} ASTER / ACTIVITY\n` +
                `-# ${symbols.live} Live 24-hour activity leaderboard`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // CHAT
        // ========================================================

        let chatText;

        if (!chat.length) {

            chatText =
                `${symbols.chat} No chat activity recorded.`;

        } else {

            chatText = chat
                .map((user, index) =>
                    `${ranks[index]}  <@${user.user_id}>\n` +
                    `-# ${symbols.chat} **${Number(user.messages).toLocaleString()}** messages`
                )
                .join("\n\n");
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.chat} Chat Kings\n\n` +
                chatText
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // VOICE
        // ========================================================

        let voiceText;

        if (!voice.length) {

            voiceText =
                `${symbols.voice} No voice activity recorded.`;

        } else {

            voiceText = voice
                .map((user, index) =>
                    `${ranks[index]}  <@${user.user_id}>\n` +
                    `-# ${symbols.voice} **${formatVoice(user.voice_time)}**`
                )
                .join("\n\n");
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.voice} Voice Kings\n\n` +
                voiceText
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
                `-# ${symbols.brand} ASTER • Activity System`
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