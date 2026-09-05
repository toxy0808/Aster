const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");
const { symbols, timestamps } = require("../utils/asterUI");

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

        if (type === "chat") {

            users = db.prepare(`
                SELECT *
                FROM users
                ORDER BY messages DESC
                LIMIT 10
            `).all();

        }

        else if (type === "voice") {

            users = db.prepare(`
                SELECT *
                FROM users
                WHERE voice_time > 0
                ORDER BY voice_time DESC
                LIMIT 10
            `).all();

        }

        else if (type === "overall") {

            users = db.prepare(`
                SELECT *,
                (messages + voice_time) AS activity
                FROM users
                ORDER BY activity DESC
                LIMIT 10
            `).all();

        }

        else {

            return message.reply(
                `${symbols.error} Invalid leaderboard type.\n` +
                `-# Available: \`chat\`, \`voice\`, \`overall\``
            );

        }

        if (!users.length) {

            return message.reply(
                `${symbols.info} No users found for this leaderboard.`
            );

        }

        const mode = {
            chat: {
                title: "Chat",
                icon: symbols.chat,
                description: "Top members ranked by messages",
                value: user => `${user.messages.toLocaleString()} messages`
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
                    `${user.messages.toLocaleString()} msgs + ` +
                    `${(user.voice_time || 0).toLocaleString()} voice min`
            }
        }[type];

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4FA3);

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${symbols.leaderboard} ASTER / ${mode.title.toUpperCase()}\n` +
                `-# ${mode.description}`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

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

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${symbols.time} Updated ${timestamps.now()}\n` +
                `-# ${symbols.brand} ASTER • Activity Leaderboard`
            )
        );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: {
                parse: []
            }
        });
    }
};