const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");
const {
    symbols,
    timestamps,
    styles
} = require("../utils/asterUI");

const ACCENT =
    styles?.getTheme?.()?.colors?.accent ??
    0x7C5CFF;

module.exports = {

    name: "leaderboard",

    aliases: [
        "lb",
        "top"
    ],

    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the activity leaderboard.")
        .addStringOption(option =>
            option
                .setName("type")
                .setDescription("The leaderboard to view.")
                .setRequired(false)
                .addChoices(
                    {
                        name: "Chat",
                        value: "chat"
                    },
                    {
                        name: "Voice",
                        value: "voice"
                    },
                    {
                        name: "Overall",
                        value: "overall"
                    }
                )
        ),

    async execute(message, args) {

        console.log("LB ARGS:", args);

        const type =
            message.options?.getString("type")?.toLowerCase() ||
            args[0]?.toLowerCase() ||
            "chat";

        let users;

        // ====================================================
        // LOAD LEADERBOARD
        // ====================================================

        if (type === "chat") {

            users = db.prepare(`
                SELECT *
                FROM users
                ORDER BY messages DESC
                LIMIT 10
            `).all();

        } else if (type === "voice") {

            users = db.prepare(`
                SELECT *
                FROM users
                WHERE voice_time > 0
                ORDER BY voice_time DESC
                LIMIT 10
            `).all();

        } else if (type === "overall") {

            users = db.prepare(`
                SELECT *,
                (messages + voice_time) AS activity
                FROM users
                ORDER BY activity DESC
                LIMIT 10
            `).all();

        } else {

            return message.reply({
                content:
                    `${symbols.error} Invalid leaderboard type.\n` +
                    `-# Available: \`chat\`, \`voice\`, \`overall\``,
                allowedMentions: {
                    parse: []
                }
            });

        }

        // ====================================================
        // EMPTY STATE
        // ====================================================

        if (!users.length) {

            return message.reply({
                content:
                    `${symbols.info} No users found for this leaderboard.`,
                allowedMentions: {
                    parse: []
                }
            });

        }

        // ====================================================
        // LEADERBOARD MODE
        // ====================================================

        const mode = {
            chat: {
                title: "Chat",
                icon: symbols.chat,
                description: "Top members ranked by messages",
                value: user =>
                    `${(user.messages || 0).toLocaleString()} messages`
            },

            voice: {
                title: "Voice",
                icon: symbols.voice,
                description: "Top members ranked by voice activity",
                value: user =>
                    `${(user.voice_time || 0).toLocaleString()} minutes`
            },

            overall: {
                title: "Overall",
                icon: symbols.activity,
                description: "Top members ranked by total activity",
                value: user =>
                    `${(user.messages || 0).toLocaleString()} msgs + ` +
                    `${(user.voice_time || 0).toLocaleString()} voice min`
            }
        }[type];

        // ====================================================
        // ASTER CONTAINER
        // ====================================================

        const container = new ContainerBuilder()
            .setAccentColor(ACCENT);

        // ====================================================
        // HEADER
        // ====================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${symbols.leaderboard} ASTER / ${mode.title.toUpperCase()}\n` +
                `-# ${mode.description}`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ====================================================
        // RANKINGS
        // ====================================================

        const lines = [];

        for (let i = 0; i < users.length; i++) {

            const user = users[i];

            const member =
                await message.guild.members
                    .fetch(user.user_id)
                    .catch(() => null);

            const username =
                member
                    ? member.user.username
                    : "Unknown User";

            let rank;

            if (i === 0) {
                rank = "🥇";
            } else if (i === 1) {
                rank = "🥈";
            } else if (i === 2) {
                rank = "🥉";
            } else {
                rank =
                    `**${String(i + 1).padStart(2, "0")}**`;
            }

            lines.push(
                `${rank}  **${username}**\n` +
                `> ${mode.value(user)}`
            );
        }

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${mode.icon} Top 10\n\n` +
                lines.join("\n\n")
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ====================================================
        // FOOTER
        // ====================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${symbols.time} Updated ${timestamps.now()}\n` +
                `-# ${symbols.brand} ASTER • Activity Leaderboard`
            )
        );

        // ====================================================
        // SEND
        // ====================================================

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: {
                parse: []
            }
        });
    }
};