const {
    SlashCommandBuilder,
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

    data: new SlashCommandBuilder()
        .setName("autoresponder")
        .setDescription("Manage server autoresponders.")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator.toString()
        )

        // ========================================================
        // ADD
        // ========================================================

        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Create an autoresponder.")

                .addStringOption(option =>
                    option
                        .setName("trigger")
                        .setDescription("The trigger phrase.")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription("The response type.")
                        .setRequired(true)
                        .addChoices(
                            {
                                name: "Text",
                                value: "text"
                            },
                            {
                                name: "GIF",
                                value: "gif"
                            },
                            {
                                name: "Image",
                                value: "image"
                            },
                            {
                                name: "Embed",
                                value: "embed"
                            }
                        )
                )

                .addStringOption(option =>
                    option
                        .setName("response")
                        .setDescription(
                            "The response text. Not required for images/GIFs."
                        )
                        .setRequired(false)
                )

                // ------------------------------------------------
                // NEW: SLASH COMMAND FILE UPLOAD
                // ------------------------------------------------

                .addAttachmentOption(option =>
                    option
                        .setName("attachment")
                        .setDescription(
                            "Upload the image or GIF for this autoresponder."
                        )
                        .setRequired(false)
                )
        )

        // ========================================================
        // REMOVE
        // ========================================================

        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove an autoresponder.")

                .addStringOption(option =>
                    option
                        .setName("trigger")
                        .setDescription(
                            "The trigger phrase to remove."
                        )
                        .setRequired(true)
                )
        )

        // ========================================================
        // LIST
        // ========================================================

        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription(
                    "List active autoresponders."
                )
        )

        // ========================================================
        // CLEAR
        // ========================================================

        .addSubcommand(subcommand =>
            subcommand
                .setName("clear")
                .setDescription(
                    "Remove all autoresponders."
                )
        )

        // ========================================================
        // GUIDE
        // ========================================================

        .addSubcommand(subcommand =>
            subcommand
                .setName("guide")
                .setDescription(
                    "View the autoresponder guide."
                )
        ),

    async execute(message, args) {

        // ========================================================
        // SLASH COMMAND ADAPTER
        // ========================================================

        if (message.options?.getSubcommand) {

            const subcommand =
                message.options.getSubcommand();

            // ====================================================
            // ADD
            // ====================================================

            if (subcommand === "add") {

                const trigger =
                    message.options.getString(
                        "trigger"
                    );

                const type =
                    message.options.getString(
                        "type"
                    );

                const response =
                    message.options.getString(
                        "response"
                    );

                // ------------------------------------------------
                // Get uploaded file directly from slash command
                // ------------------------------------------------

                const attachment =
                    message.options.getAttachment(
                        "attachment"
                    );

                args = [
                    "add",
                    trigger,
                    type
                ];

                if (response) {

                    args.push(
                        response
                    );

                }

                // ------------------------------------------------
                // Store attachment on adapter message
                // ------------------------------------------------

                message.attachment =
                    attachment || null;

            }

            // ====================================================
            // REMOVE
            // ====================================================

            else if (subcommand === "remove") {

                const trigger =
                    message.options.getString(
                        "trigger"
                    );

                args = [
                    "remove",
                    trigger
                ];

            }

            // ====================================================
            // LIST
            // ====================================================

            else if (subcommand === "list") {

                args = [
                    "list"
                ];

            }

            // ====================================================
            // CLEAR
            // ====================================================

            else if (subcommand === "clear") {

                args = [
                    "clear"
                ];

            }

            // ====================================================
            // GUIDE
            // ====================================================

            else if (subcommand === "guide") {

                args = [
                    "guide"
                ];

            }

        }

        // ========================================================
        // PERMISSION
        // ========================================================

        if (
            !message.member.permissions.has(
                PermissionFlagsBits.Administrator
            )
        ) {

            return message.reply({

                components: [

                    new ContainerBuilder()
                        .setAccentColor(
                            0xFF4FA3
                        )

                        .addTextDisplayComponents(

                            new TextDisplayBuilder()
                                .setContent(
                                    "# ✦ ASTER / AUTORESPONDER\n" +
                                    "### 🔒 Access Denied\n\n" +
                                    "You need **Administrator** permission to manage autoresponders."
                                )

                        )

                ],

                flags:
                    MessageFlags.IsComponentsV2

            });

        }

        const action =
            args.shift()?.toLowerCase();

        // ========================================================
        // ADD
        // ========================================================

        if (action === "add") {

            const trigger =
                args.shift();

            const type =
                args.shift()?.toLowerCase();

            if (
                !trigger ||
                !type
            ) {

                return message.reply({

                    components: [

                        new ContainerBuilder()
                            .setAccentColor(
                                0xFF4FA3
                            )

                            .addTextDisplayComponents(

                                new TextDisplayBuilder()
                                    .setContent(
                                        "# ✦ ASTER / AUTORESPONDER\n" +
                                        "### ⚙ Usage\n\n" +
                                        "`/autoresponder add <trigger> <type> [response] [attachment]`"
                                    )

                            )

                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

            }

            // ====================================================
            // VALID TYPE
            // ====================================================

            if (
                ![
                    "text",
                    "gif",
                    "image",
                    "embed"
                ].includes(type)
            ) {

                return message.reply({

                    components: [

                        new ContainerBuilder()
                            .setAccentColor(
                                0xFF4FA3
                            )

                            .addTextDisplayComponents(

                                new TextDisplayBuilder()
                                    .setContent(
                                        "# ✦ ASTER / AUTORESPONDER\n" +
                                        "### ⚠ Invalid Response Type\n\n" +
                                        "Supported types:\n" +
                                        "`text` · `gif` · `image` · `embed`"
                                    )

                            )

                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

            }

            // ====================================================
            // TRIGGER LENGTH
            // ====================================================

            if (
                trigger.length >
                MAX_TRIGGER_LENGTH
            ) {

                return message.reply({

                    components: [

                        new ContainerBuilder()
                            .setAccentColor(
                                0xFF4FA3
                            )

                            .addTextDisplayComponents(

                                new TextDisplayBuilder()
                                    .setContent(
                                        "# ✦ ASTER / AUTORESPONDER\n" +
                                        "### ⚠ Trigger Too Long\n\n" +
                                        `Maximum trigger length: **${MAX_TRIGGER_LENGTH} characters**.`
                                    )

                            )

                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

            }

            // ====================================================
            // ATTACHMENT
            // ====================================================

            const attachment =
                message.attachment ||
                message.attachments?.first() ||
                null;

            let content =
                args
                    .join(" ")
                    .trim();

            // ====================================================
            // IMAGE / GIF
            // ====================================================

            if (
                type === "image" ||
                type === "gif"
            ) {

                if (!attachment) {

                    return message.reply({

                        components: [

                            new ContainerBuilder()
                                .setAccentColor(
                                    0xFF4FA3
                                )

                                .addTextDisplayComponents(

                                    new TextDisplayBuilder()
                                        .setContent(
                                            "# ✦ ASTER / AUTORESPONDER\n" +
                                            "### 🖼 Media Required\n\n" +
                                            "Upload the **image or GIF** using the **attachment** option.\n\n" +
                                            "Example:\n" +
                                            "`/autoresponder add trigger:cat type:gif attachment:cat.gif`"
                                        )

                                )

                        ],

                        flags:
                            MessageFlags.IsComponentsV2

                    });

                }

                content = "";

            }

            // ====================================================
            // CONTENT REQUIRED
            // ====================================================

            if (
                !content &&
                type !== "image" &&
                type !== "gif"
            ) {

                return message.reply({

                    components: [

                        new ContainerBuilder()
                            .setAccentColor(
                                0xFF4FA3
                            )

                            .addTextDisplayComponents(

                                new TextDisplayBuilder()
                                    .setContent(
                                        "# ✦ ASTER / AUTORESPONDER\n" +
                                        "### ⚠ Response Required\n\n" +
                                        "You need to provide a response."
                                    )

                            )

                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

            }

            // ====================================================
            // SAVE
            // ====================================================

            const result =
                await add(
                    message.guild.id,
                    trigger,
                    type,
                    content,
                    attachment
                );

            // ====================================================
            // SAVE FAILED
            // ====================================================

            if (!result.success) {

                if (
                    result.reason ===
                    "guild_limit"
                ) {

                    return message.reply({

                        components: [

                            new ContainerBuilder()
                                .setAccentColor(
                                    0xFF4FA3
                                )

                                .addTextDisplayComponents(

                                    new TextDisplayBuilder()
                                        .setContent(
                                            "# ✦ ASTER / AUTORESPONDER\n" +
                                            "### ⚠ Server Limit Reached\n\n" +
                                            `This server already has the maximum of **${MAX_AUTORESPONDERS_PER_GUILD}** autoresponders.`
                                        )

                                )

                        ],

                        flags:
                            MessageFlags.IsComponentsV2

                    });

                }

                if (
                    result.reason ===
                    "media_too_large"
                ) {

                    return message.reply({

                        components: [

                            new ContainerBuilder()
                                .setAccentColor(
                                    0xFF4FA3
                                )

                                .addTextDisplayComponents(

                                    new TextDisplayBuilder()
                                        .setContent(
                                            "# ✦ ASTER / AUTORESPONDER\n" +
                                            "### ⚠ File Too Large\n\n" +
                                            "The uploaded media must be **10 MB or smaller**."
                                        )

                                )

                        ],

                        flags:
                            MessageFlags.IsComponentsV2

                    });

                }

                if (
                    result.reason ===
                    "invalid_gif"
                ) {

                    return message.reply({

                        components: [

                            new ContainerBuilder()
                                .setAccentColor(
                                    0xFF4FA3
                                )

                                .addTextDisplayComponents(

                                    new TextDisplayBuilder()
                                        .setContent(
                                            "# ✦ ASTER / AUTORESPONDER\n" +
                                            "### ⚠ Invalid GIF\n\n" +
                                            "For a GIF autoresponder, upload a valid `.gif` file."
                                        )

                                )

                        ],

                        flags:
                            MessageFlags.IsComponentsV2

                    });

                }

                if (
                    result.reason ===
                    "invalid_image"
                ) {

                    return message.reply({

                        components: [

                            new ContainerBuilder()
                                .setAccentColor(
                                    0xFF4FA3
                                )

                                .addTextDisplayComponents(

                                    new TextDisplayBuilder()
                                        .setContent(
                                            "# ✦ ASTER / AUTORESPONDER\n" +
                                            "### ⚠ Invalid Image\n\n" +
                                            "Please upload a PNG, JPG, JPEG, WEBP, or GIF image."
                                        )

                                )

                        ],

                        flags:
                            MessageFlags.IsComponentsV2

                    });

                }

                return message.reply({

                    components: [

                        new ContainerBuilder()
                            .setAccentColor(
                                0xFF4FA3
                            )

                            .addTextDisplayComponents(

                                new TextDisplayBuilder()
                                    .setContent(
                                        "# ✦ ASTER / AUTORESPONDER\n" +
                                        "### ❌ Save Failed\n\n" +
                                        "ASTER was unable to save this autoresponder."
                                    )

                            )

                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

            }

            // ====================================================
            // SUCCESS
            // ====================================================

            const container =
                new ContainerBuilder()

                    .setAccentColor(
                        0xFF4FA3
                    )

                    .addTextDisplayComponents(

                        new TextDisplayBuilder()
                            .setContent(
                                "# ✦ ASTER / AUTORESPONDER\n" +
                                "### 🟢 Autoresponder Created\n\n" +
                                `**Trigger**\n\`${trigger}\`\n\n` +
                                `**Response Type**\n\`${type}\`\n\n` +
                                (
                                    type === "image" ||
                                    type === "gif"
                                        ? "🖼 **Media uploaded and stored successfully.**\n\n"
                                        : ""
                                ) +
                                "-# Configuration saved successfully."
                            )

                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(

                        new TextDisplayBuilder()
                            .setContent(
                                "### ⚡ Matching\n" +
                                "The trigger is case-insensitive and can appear anywhere in a message."
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

        // ========================================================
        // REMOVE
        // ========================================================

        if (action === "remove") {

            const trigger =
                args
                    .join(" ")
                    .trim();

            if (!trigger) {

                return message.reply({

                    components: [

                        new ContainerBuilder()
                            .setAccentColor(
                                0xFF4FA3
                            )

                            .addTextDisplayComponents(

                                new TextDisplayBuilder()
                                    .setContent(
                                        "# ✦ ASTER / AUTORESPONDER\n" +
                                        "### ⚙ Usage\n\n" +
                                        "`/autoresponder remove <trigger>`"
                                    )

                            )

                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

            }

            const deleted =
                remove(
                    message.guild.id,
                    trigger
                );

            if (!deleted) {

                return message.reply({

                    components: [

                        new ContainerBuilder()
                            .setAccentColor(
                                0xFF4FA3
                            )

                            .addTextDisplayComponents(

                                new TextDisplayBuilder()
                                    .setContent(
                                        "# ✦ ASTER / AUTORESPONDER\n" +
                                        "### ⚠ Not Found\n\n" +
                                        `No autoresponder exists for \`${trigger}\`.`
                                    )

                            )

                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

            }

            return message.reply({

                components: [

                    new ContainerBuilder()
                        .setAccentColor(
                            0xFF4FA3
                        )

                        .addTextDisplayComponents(

                            new TextDisplayBuilder()
                                .setContent(
                                    "# ✦ ASTER / AUTORESPONDER\n" +
                                    "### 🔴 Autoresponder Removed\n\n" +
                                    `Trigger \`${trigger}\` has been removed.`
                                )

                        )

                ],

                flags:
                    MessageFlags.IsComponentsV2

            });

        }

        // ========================================================
        // LIST
        // ========================================================

        if (action === "list") {

            const guild =
                getGuild(
                    message.guild.id
                );

            if (
                !guild ||
                !guild.size
            ) {

                return message.reply({

                    components: [

                        new ContainerBuilder()
                            .setAccentColor(
                                0xFF4FA3
                            )

                            .addTextDisplayComponents(

                                new TextDisplayBuilder()
                                    .setContent(
                                        "# ✦ ASTER / AUTORESPONDER\n" +
                                        "### ◌ No Autoresponders\n\n" +
                                        "This server currently has no configured autoresponders."
                                    )

                            )

                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

            }

            const entries =
                [
                    ...guild.entries()
                ]

                    .map(
                        ([trigger, response]) =>
                            `**${trigger}**  ·  \`${response.type}\``
                    )

                    .join("\n");

            const container =
                new ContainerBuilder()

                    .setAccentColor(
                        0xFF4FA3
                    )

                    .addTextDisplayComponents(

                        new TextDisplayBuilder()
                            .setContent(
                                "# ✦ ASTER / AUTORESPONDER\n" +
                                `### 📋 Active Triggers\n\n${entries}`
                            )

                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(

                        new TextDisplayBuilder()
                            .setContent(
                                `### 📊 Status\n` +
                                `**${guild.size}** active autoresponder${guild.size === 1 ? "" : "s"}`
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

        // ========================================================
        // CLEAR
        // ========================================================

        if (action === "clear") {

            const guild =
                getGuild(
                    message.guild.id
                );

            if (
                !guild ||
                !guild.size
            ) {

                return message.reply({

                    components: [

                        new ContainerBuilder()
                            .setAccentColor(
                                0xFF4FA3
                            )

                            .addTextDisplayComponents(

                                new TextDisplayBuilder()
                                    .setContent(
                                        "# ✦ ASTER / AUTORESPONDER\n" +
                                        "### ◌ Nothing to Clear\n\n" +
                                        "There are no autoresponders configured."
                                    )

                            )

                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

            }

            clear(
                message.guild.id
            );

            return message.reply({

                components: [

                    new ContainerBuilder()
                        .setAccentColor(
                            0xFF4FA3
                        )

                        .addTextDisplayComponents(

                            new TextDisplayBuilder()
                                .setContent(
                                    "# ✦ ASTER / AUTORESPONDER\n" +
                                    "### 🗑 Autoresponders Cleared\n\n" +
                                    "All autoresponders for this server have been removed."
                                )

                        )

                ],

                flags:
                    MessageFlags.IsComponentsV2

            });

        }

        // ========================================================
        // GUIDE
        // ========================================================

        const container =
            new ContainerBuilder()

                .setAccentColor(
                    0xFF4FA3
                )

                .addTextDisplayComponents(

                    new TextDisplayBuilder()
                        .setContent(
                            "# ✦ ASTER / AUTORESPONDER\n" +
                            "### ⚡ Automatic Server Responses\n\n" +
                            "ASTER automatically responds whenever a configured trigger appears in a message."
                        )

                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(

                    new TextDisplayBuilder()
                        .setContent(
                            "### ✦ Create\n\n" +
                            "`/autoresponder add <trigger> <type> [response] [attachment]`\n\n" +
                            "For **image/GIF** responses, use the **attachment** option directly in the slash command."
                        )

                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(

                    new TextDisplayBuilder()
                        .setContent(
                            "### ⚙ Manage\n\n" +
                            "`/autoresponder remove <trigger>`\n" +
                            "`/autoresponder list`\n" +
                            "`/autoresponder clear`"
                        )

                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(

                    new TextDisplayBuilder()
                        .setContent(
                            "### 🧪 Examples\n\n" +
                            "`/autoresponder add toxy text response:TOXY MENTIONED 👀`\n" +
                            "`/autoresponder add cat gif attachment:cat.gif`\n" +
                            "`/autoresponder add logo image attachment:logo.png`"
                        )

                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(

                    new TextDisplayBuilder()
                        .setContent(
                            "### 🔎 Matching Rules\n\n" +
                            "**Case-insensitive** · triggers can appear anywhere in a message · replies are supported\n\n" +
                            "-# Word boundaries are respected, so `toxy` does not trigger from `toxic`."
                        )

                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(

                    new TextDisplayBuilder()
                        .setContent(
                            "-# ✦ ASTER • Autoresponder System\n" +
                            "-# Administrator access required"
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