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
    clear,
    MAX_TRIGGER_LENGTH,
    MAX_AUTORESPONDERS_PER_GUILD
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
                    "Usage: `,ar add <trigger> <text|gif|image|embed> <response>`"
                );
            }

            // =================================================
            // VALID TYPE
            // =================================================

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

            // =================================================
            // TRIGGER LENGTH
            // =================================================

            if (
                trigger.length >
                MAX_TRIGGER_LENGTH
            ) {

                return message.reply(
                    `Trigger must be **${MAX_TRIGGER_LENGTH} characters or less**.`
                );
            }

            // =================================================
            // ATTACHMENT
            // =================================================

            const attachment =
                message.attachments.first();

            let content =
                args.join(" ").trim();

            // =================================================
            // IMAGE / GIF
            // =================================================

            if (
                type === "image" ||
                type === "gif"
            ) {

                /*
                 * Media MUST be uploaded directly.
                 *
                 * We intentionally do not accept pasted
                 * URLs because Discord CDN URLs can become
                 * unavailable and break the autoresponder.
                 */

                if (!attachment) {

                    return message.reply(
                        "⚠️ **Upload the image/GIF directly to this message.**\n\n" +
                        "Do not paste an image URL. Discord media URLs can expire or become unavailable, which may break the autoresponder.\n\n" +
                        "Attach the **image or GIF file** and run the command again."
                    );
                }

                // Use the uploaded attachment
                content =
                    attachment.url;
            }

            // =================================================
            // CONTENT REQUIRED
            // =================================================

            if (!content) {

                return message.reply(
                    "You need to provide a response."
                );
            }

            // =================================================
            // SAVE
            // =================================================

            const result =
                add(
                    message.guild.id,
                    trigger,
                    type,
                    content
                );

            if (!result.success) {

                if (
                    result.reason ===
                    "guild_limit"
                ) {

                    return message.reply(
                        `This server already has the maximum of **${MAX_AUTORESPONDERS_PER_GUILD}** autoresponders.`
                    );
                }

                return message.reply(
                    "Unable to save this autoresponder."
                );
            }

            // =================================================
            // SUCCESS
            // =================================================

            const container =
                new ContainerBuilder()
                    .setAccentColor(
                        0xFF006E
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "# ✦ Autoresponder\n\n" +
                                `**Trigger**\n\`${trigger}\`\n\n` +
                                `**Response**\n\`${type}\`\n\n` +
                                "Configuration saved."
                            )
                    );

            return message.reply({
                components: [
                    container
                ],
                flags:
                    MessageFlags.IsComponentsV2
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

            if (
                !guild ||
                !guild.size
            ) {

                return message.reply(
                    "No autoresponders are configured."
                );
            }

            const entries =
                [
                    ...guild.entries()
                ]
                .map(
                    ([trigger, response]) =>
                        `**${trigger}** · \`${response.type}\``
                )
                .join("\n");

            const container =
                new ContainerBuilder()
                    .setAccentColor(
                        0xFF006E
                    )

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
                                `**${guild.size}** active`
                            )
                    );

            return message.reply({
                components: [
                    container
                ],
                flags:
                    MessageFlags.IsComponentsV2
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

            if (
                !guild ||
                !guild.size
            ) {

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
                .setAccentColor(
                    0xFF006E
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            "# ✦ ASTER Autoresponder\n" +
                            "### Automatic server responses\n\n" +
                            "ASTER can react whenever a configured trigger appears anywhere in a message."
                        )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            "### Create\n\n" +
                            "`,ar add <trigger> text <response>`\n" +
                            "`,ar add <trigger> embed <text>`\n" +
                            "`,ar add <trigger> image` + **attach an image**\n" +
                            "`,ar add <trigger> gif` + **attach a GIF**\n\n" +
                            "For **images/GIFs**, upload the file directly to the command message.\n" +
                            "Pasted media URLs are not supported because they can become unavailable."
                        )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            "### Manage\n\n" +
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
                            "`,ar add toxy text TOXY MENTIONED 👀`\n" +
                            "`,ar add cat gif` + **attach `cat.gif`**\n" +
                            "`,ar add logo image` + **attach `logo.png`**\n\n" +
                            "Then `toxy`, `TOXY`, or `yo toxy bro` will trigger it."
                        )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            "### Matching\n\n" +
                            "Triggers are **case-insensitive** and can appear anywhere in a message, including replies.\n\n" +
                            "Word boundaries are respected, so `toxy` won't trigger from `toxic`."
                        )
                );

        return message.reply({
            components: [
                container
            ],
            flags:
                MessageFlags.IsComponentsV2
        });
    }
};