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

    // Auto reactions
    const autoReact = db.prepare(
        "SELECT emoji FROM autoreacts WHERE user_id = ? AND enabled = 1"
        ).get(message.author.id);

        if (autoReact) {
            message.react(autoReact.emoji).catch(() => {});
            }

            if (message.mentions.has(client.user)) {

const { EmbedBuilder } = require("discord.js");

const embed = new EmbedBuilder()
.setColor("#FF4DA6")
.setTitle("<a:Weedleaf2:1459619037980921887> ASTER • Activity Intelligence")
.setDescription(
`Hey! I'm **ASTER**, a custom activity bot built to track and reward your community.

<a:Fire8:1459590813410660564> **Activity Tracking**
> Track messages and voice activity

<a:WeedLeaf:1459620147424788703> **Leaderboards**
> Live rankings and weekly competitions

<a:PinkCrown:1459619059707674809> **Rewards**
> Top members earn special roles

⚙️ Use \`,help\` to see my commands.`
)
.addFields(
{
name: "📊 Stats",
value: "`,activity` • View your activity\n`,rank` • Check your profile",
inline: true
},
{
name: "🏆 Rankings",
value: "`,activitylb` • View leaderboard",
inline: true
}
)
.setThumbnail(client.user.displayAvatarURL())
.setFooter({
text: "ASTER • Built for communities"
})
.setTimestamp();

return message.reply({
embeds: [embed]
});

}
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