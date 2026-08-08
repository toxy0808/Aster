const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");
const prefix = ",";
const cooldowns = new Set();
const activityDB = require("../database/activityLogs");

db.prepare(`
    CREATE TABLE IF NOT EXISTS autoreacts (
        user_id TEXT PRIMARY KEY,
        emoji TEXT,
        enabled INTEGER DEFAULT 1
    )
`).run();

module.exports = async (client, message) => {

    if (message.author.bot) return;
    if (!message.guild) return;

    // =========================
    // AUTO REACTIONS
    // =========================

    const autoReact = db.prepare(
        "SELECT emoji FROM autoreacts WHERE user_id = ? AND enabled = 1"
    ).get(message.author.id);

    if (autoReact) {
        message.react(autoReact.emoji).catch(() => {});
    }

    // =========================
    // ASTER INTRO
    // =========================
    // Only trigger when ASTER is mentioned directly.
    // Replies to ASTER will NOT trigger the intro.

    if (
        message.mentions.users.has(client.user.id) &&
        !message.reference
    ) {

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4DA6)

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "# 🌸 ASTER • Activity Intelligence\n" +
                    "Your community's activity tracking system."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 📊 Activity\n" +
                    "` ,activity ` — View your activity\n" +
                    "` ,rank ` — View your activity profile\n" +
                    "` ,activitylb ` — View the live leaderboard"
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 🏆 Leaderboards\n" +
                    "Live **24H** and **7D** chat & voice rankings.\n" +
                    "Compete for the top spots and weekly rewards."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 🎁 Rewards\n" +
                    "Top activity members can earn special server roles."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### ⚙️ Commands\n" +
                    "Use `,help` to view all available commands.\n\n" +
                    "ASTER • Built for communities"
                )
            );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }

    // =========================
    // MESSAGE COOLDOWN
    // =========================

    if (cooldowns.has(message.author.id)) {
        return;
    }

    // =========================
    // MESSAGE TRACKING
    // =========================

    const userId = message.author.id;

    db.prepare(
        "INSERT INTO activity_logs (user_id, type, amount) VALUES (?, ?, ?)"
    ).run(
        userId,
        "message",
        1
    );

    const user = db.prepare(
        "SELECT * FROM users WHERE user_id = ?"
    ).get(userId);

    if (!user) {

        db.prepare(
            "INSERT INTO users (user_id, messages, voice_time, xp, level) VALUES (?, 1, 0, 10, 1)"
        ).run(userId);

    } else {

        const xpGain =
            Math.floor(Math.random() * 11) + 5;

        const newXp =
            user.xp + xpGain;

        const newLevel =
            Math.floor(Math.sqrt(newXp / 100)) + 1;

        activityDB.prepare(`
            INSERT INTO activity_logs
            (user_id, type, amount)
            VALUES (?, ?, ?)
        `).run(
            userId,
            "chat",
            1
        );

        db.prepare(
            "UPDATE users SET messages = messages + 1, xp = ?, level = ? WHERE user_id = ?"
        ).run(
            newXp,
            newLevel,
            userId
        );
    }

    // =========================
    // PREFIX COMMANDS
    // =========================

    if (!message.content.startsWith(prefix)) {
        return;
    }

    const args = message.content
        .slice(prefix.length)
        .trim()
        .split(/ +/);

    const commandName = args
        .shift()
        .toLowerCase();

    console.log("COMMAND:", commandName);

    let command = client.commands.get(commandName);

    if (!command) {

        command = [...client.commands.values()]
            .find(cmd =>
                cmd.aliases &&
                cmd.aliases.includes(commandName)
            );
    }

    if (!command) return;

    try {

        await command.execute(
            message,
            args
        );

    } catch (error) {

        console.error(
            "COMMAND ERROR:",
            error
        );

        message.reply(
            "Command error, check console."
        );
    }
};