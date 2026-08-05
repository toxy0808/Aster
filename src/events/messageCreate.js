const db = require("../database/database");
const prefix = ",";
const cooldowns = new Set();
const activityDB = require("../database/activityLogs");
module.exports = async (client, message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (cooldowns.has(message.author.id)) {
    return;
}

 // Message tracking
const userId = message.author.id;

db.prepare(
    "INSERT INTO activity_logs (user_id, type, amount) VALUES (?, ?, ?)"
).run(userId, "message", 1);

const user = db.prepare(
    "SELECT * FROM users WHERE user_id = ?"
).get(userId);

if (!user) {
    db.prepare(
        "INSERT INTO users (user_id, messages, voice_time, xp, level) VALUES (?, 1, 0, 10, 1)"
    ).run(userId);
} else {
    const xpGain = Math.floor(Math.random() * 11) + 5;
const newXp = user.xp + xpGain;
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
activityDB.prepare(
    `
    INSERT INTO activity_logs
    (user_id, type, amount)
    VALUES (?, ?, ?)
    `
).run(
    userId,
    "chat",
    1
);


    db.prepare(
        "UPDATE users SET messages = messages + 1, xp = ?, level = ? WHERE user_id = ?"
    ).run(newXp, newLevel, userId);
}
    // Prefix commands
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase(); console.log("COMMAND:", commandName);

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

    await command.execute(message, args);

} catch (error) {

    console.error("COMMAND ERROR:", error);

    message.reply("Command error, check console.");

}

};