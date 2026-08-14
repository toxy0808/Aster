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
        // PERMISSIONS
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
                    "Usage: `,ar add <trigger> <text|gif|image|embed> <response>`"
                );
            }

            if (
                ![
                    "text",
                    "gif",
                    "image",
                    "embed"
                ].includes(type)
            ) {

                return message.reply(
                    "Type must be `text`, `gif`, `image`, or `embed`."
                );
            }

            // ================================================
            // ATTACHMENT
            // ================================================

            const attachment =
                message.attachments.first();

            let content =
                args.join(" ").trim();

            // ================================================
            // IMAGE / GIF ATTACHMENT
            // ================================================

            if (
                (type === "image" ||
                 type === "gif") &&
                attachment
            ) {

                content =
                    attachment.url;
            }

            // ================================================
            // REQUIRE CONTENT
            // ================================================

            if (!content) {

                return message.reply(
                    type === "image" ||
                    type === "gif"

                        ? "Attach an image/GIF or provide a URL."
                        : "You need to provide a response."
                );
            }

            // ================================================
            // URL VALIDATION
            // ================================================

            if (
                type === "image" ||
                type === "gif"
            ) {

                if (
                    !content.startsWith("http://") &&
                    !content.startsWith("https://")
                ) {

                    return message.reply(
                        "Please provide a valid image/GIF URL or attach the file."
                    );
                }
            }

            // ================================================
            // SAVE
            // ================================================

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
                                "Configuration saved."
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
                    `No autoresponder found for \`${trigger}\`.`
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

            if (!guild || !guild.size) {

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

            if (!guild || !guild.size) {

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
                            "`,ar add <trigger> image <url>`\n" +
                            "`,ar add <trigger> embed <text>`\n\n" +
                            "You can also **attach an image/GIF** instead of using a URL.\n\n" +
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
                            "`,ar add logo image https://example.com/logo.png`\n" +
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