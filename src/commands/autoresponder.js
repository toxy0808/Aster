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

        // ====================================================
        // PERMISSION
        // ====================================================

        if (
            !message.member.permissions.has(
                PermissionFlagsBits.Administrator
            )
        ) {

            return message.reply(
                "You need **Administrator** permission to manage autoresponders."
            );
        }

        const action =
            args.shift()?.toLowerCase();

        // ====================================================
        // ADD
        // ====================================================

        if (action === "add") {

            const trigger =
                args.shift();

            const type =
                args.shift()?.toLowerCase();

            if (!trigger || !type) {

                return message.reply(
                    "Usage: `,ar add <trigger> <text|gif|embed> <response>`"
                );
            }

            if (
                !["text", "gif", "embed"]
                    .includes(type)
            ) {

                return message.reply(
                    "Response type must be `text`, `gif`, or `embed`."
                );
            }

            const content =
                args.join(" ").trim();

            if (!content) {

                return message.reply(
                    "You need to provide a response."
                );
            }

            // GIF validation
            if (type === "gif") {

                if (
                    !content.startsWith("http://") &&
                    !content.startsWith("https://")
                ) {

                    return message.reply(
                        "GIF responses must use a valid URL."
                    );
                }
            }

            add(
                message.guild.id,
                trigger,
                type,
                content
            );

            const container =
                new ContainerBuilder()
                    .setAccentColor(0xFF006E)

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "# ✦ Autoresponder\n\n" +
                                `**Trigger**\n\`${trigger}\`\n\n` +
                                `**Type**\n\`${type}\`\n\n` +
                                "Autoresponder saved successfully."
                            )
                    );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ====================================================
        // REMOVE
        // ====================================================

        if (action === "remove") {

            const trigger =
                args.join(" ").trim();

            if (!trigger) {

                return message.reply(
                    "Usage: `,ar remove <trigger>`"
                );
            }

            const deleted =
                remove(
                    message.guild.id,
                    trigger
                );

            if (!deleted) {

                return message.reply(
                    `No autoresponder exists for \`${trigger}\`.`
                );
            }

            return message.reply(
                `Autoresponder \`${trigger}\` removed.`
            );
        }

        // ====================================================
        // LIST
        // ====================================================

        if (action === "list") {

            const guild =
                getGuild(
                    message.guild.id
                );

            if (!guild.size) {

                return message.reply(
                    "No autoresponders are configured."
                );
            }

            const entries =
                [...guild.entries()]
                    .map(
                        ([trigger, response]) =>
                            `**${trigger}** · \`${response.type}\``
                    )
                    .join("\n");

            const container =
                new ContainerBuilder()
                    .setAccentColor(0xFF006E)

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "# ✦ Autoresponders\n\n" +
                                entries
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `**${guild.size}** active autoresponder${
                                    guild.size === 1
                                        ? ""
                                        : "s"
                                }`
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

            const guild =
                getGuild(
                    message.guild.id
                );

            if (!guild.size) {

                return message.reply(
                    "There are no autoresponders to clear."
                );
            }

            clear(
                message.guild.id
            );

            return message.reply(
                "All autoresponders have been cleared."
            );
        }

        // ====================================================
        // GUIDE
        // ,ar
        // ====================================================

        const container =
            new ContainerBuilder()
                .setAccentColor(0xFF006E)

                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            "# ✦ ASTER Autoresponder\n" +
                            "### Automatic server responses\n\n" +
                            "Create instant responses triggered by specific messages."
                        )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            "### Commands\n\n" +
                            "`,ar add <trigger> text <response>`\n" +
                            "`,ar add <trigger> gif <url>`\n" +
                            "`,ar add <trigger> embed <text>`\n\n" +
                            "`,ar remove <trigger>`\n" +
                            "`,ar list`\n" +
                            "`,ar clear`"
                        )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            "### Examples\n\n" +
                            "`,ar add hello text Hey everyone 👋`\n" +
                            "`,ar add cat gif https://example.com/cat.gif`\n" +
                            "`,ar add rules embed Please read the rules.`"
                        )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            "Triggers are **case-insensitive** and must match the entire message."
                        )
                );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};