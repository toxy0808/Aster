const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const {
    getGuild,
    add,
    remove,
    clear
} = require("../utils/autoresponder");

module.exports = {
    name: "autoresponder",
    aliases: ["ar"],

    async execute(message, args) {

        if (!message.member.permissions.has(
            PermissionFlagsBits.Administrator
        )) {
            return message.reply(
                "❌ You need **Administrator** permission to manage autoresponders."
            );
        }

        const action = args.shift()?.toLowerCase();

        // ====================================================
        // ADD
        // ====================================================

        if (action === "add") {

            const trigger = args.shift();

            if (!trigger) {
                return message.reply(
                    "Usage: `,ar add <trigger> <text>`"
                );
            }

            const response = args.join(" ").trim();

            if (!response) {
                return message.reply(
                    "❌ You need to provide a response."
                );
            }

            let type = "text";

            if (
                response.startsWith("https://tenor.com/") ||
                response.startsWith("https://media.tenor.com/") ||
                response.startsWith("https://giphy.com/") ||
                response.match(/\.(gif)(\?.*)?$/i)
            ) {
                type = "gif";
            }

            add(
                message.guild.id,
                trigger,
                {
                    type,
                    content: response
                }
            );

            return message.reply(
                `✅ Autoresponder **${trigger}** added as **${type}**.`
            );
        }

        // ====================================================
        // REMOVE
        // ====================================================

        if (action === "remove") {

            const trigger = args.join(" ").trim();

            if (!trigger) {
                return message.reply(
                    "Usage: `,ar remove <trigger>`"
                );
            }

            const deleted = remove(
                message.guild.id,
                trigger
            );

            if (!deleted) {
                return message.reply(
                    `❌ No autoresponder found for **${trigger}**.`
                );
            }

            return message.reply(
                `✅ Removed autoresponder **${trigger}**.`
            );
        }

        // ====================================================
        // LIST
        // ====================================================

        if (action === "list") {

            const guild = getGuild(message.guild.id);

            if (!guild.size) {
                return message.reply(
                    "No autoresponders configured."
                );
            }

            const entries = [...guild.entries()]
                .map(([trigger, response]) =>
                    `• \`${trigger}\` → **${response.type}**`
                )
                .join("\n");

            const container = new ContainerBuilder()
                .setAccentColor(0xFF006E)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "# ✦ Autoresponders\n\n" +
                        entries
                    )
                );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ====================================================
        // CLEAR
        // ====================================================

        if (action === "clear") {

            const guild = getGuild(message.guild.id);

            if (!guild.size) {
                return message.reply(
                    "There are no autoresponders to clear."
                );
            }

            clear(message.guild.id);

            return message.reply(
                "✅ All autoresponders have been cleared."
            );
        }

        // ====================================================
        // HELP
        // ====================================================

        return message.reply(
            "**Autoresponder**\n\n" +
            "`,ar add <trigger> <response>`\n" +
            "`,ar remove <trigger>`\n" +
            "`,ar list`\n" +
            "`,ar clear`"
        );
    }
};