const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");

module.exports = {
    name: "rephistory",
    aliases: ["rephistory", "reph"],

    async execute(message) {

        const target =
            message.mentions.users.first() ||
            message.author;

        const logs = db.prepare(`
            SELECT giver_id, type, created_at
            FROM reputation_logs
            WHERE receiver_id = ?
            ORDER BY id DESC
            LIMIT 10
        `).all(target.id);

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `📜 **ASTER • REP HISTORY**\n` +
                `✨ Reputation history for **${target.username}**`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        if (!logs.length) {

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "📭 **No reputation history found.**"
                )
            );

        } else {

            const lines = [];

            for (const log of logs) {

                const giver = await message.guild.members
                    .fetch(log.giver_id)
                    .catch(() => null);

                const name =
                    giver?.displayName ||
                    giver?.user?.username ||
                    "Unknown User";

                const positive = log.type === "positive";

                lines.push(
                    `${positive ? "🟢" : "🔴"} **${positive ? "+1" : "-1"} Rep**\n` +
                    `> 👤 <@${log.giver_id}> • 🕐 <t:${Math.floor(new Date(log.created_at).getTime() / 1000)}:R>`
                );
            }

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    lines.join("\n\n")
                )
            );
        }

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "📊 Showing the latest **10** reputation events."
            )
        );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
            allowedMentions: {
                parse: []
            } 
        });
    }
};