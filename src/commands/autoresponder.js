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
                        .setAccentColor(0xFF4FA3)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# ✦ ASTER / AUTORESPONDER\n" +
                                "### 🔒 Access Denied\n\n" +
                                "You need **Administrator** permission to manage autoresponders."
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
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

            if (!trigger || !type) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTORESPONDER\n" +
                                    "### ⚙ Usage\n\n" +
                                    "`,ar add <trigger> <text|gif|image|embed> <response>`"
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
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
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTORESPONDER\n" +
                                    "### ⚠ Invalid Response Type\n\n" +
                                    "Supported types:\n" +
                                    "`text` · `gif` · `image` · `embed`"
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
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
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTORESPONDER\n" +
                                    "### ⚠ Trigger Too Long\n\n" +
                                    `Maximum trigger length: **${MAX_TRIGGER_LENGTH} characters**.`
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // ====================================================
            // ATTACHMENT
            // ====================================================

            const attachment =
                message.attachments.first();

            let content =
                args.join(" ").trim();

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
                                .setAccentColor(0xFF4FA3)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        "# ✦ ASTER / AUTORESPONDER\n" +
                                        "### 🖼 Media Required\n\n" +
                                        "Upload the **image or GIF directly to this message**.\n\n" +
                                        "-# Pasted media URLs are not supported because they can become unavailable."
                                    )
                                )
                        ],
                        flags: MessageFlags.IsComponentsV2
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
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTORESPONDER\n" +
                                    "### ⚠ Response Required\n\n" +
                                    "You need to provide a response."
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
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

            if (!result.success) {

                if (
                    result.reason ===
                    "guild_limit"
                ) {
                    return message.reply({
                        components: [
                            new ContainerBuilder()
                                .setAccentColor(0xFF4FA3)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        "# ✦ ASTER / AUTORESPONDER\n" +
                                        "### ⚠ Server Limit Reached\n\n" +
                                        `This server already has the maximum of **${MAX_AUTORESPONDERS_PER_GUILD}** autoresponders.`
                                    )
                                )
                        ],
                        flags: MessageFlags.IsComponentsV2
                    });
                }

                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTORESPONDER\n" +
                                    "### ❌ Save Failed\n\n" +
                                    "ASTER was unable to save this autoresponder."
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // ====================================================
            // SUCCESS
            // ====================================================

            const container =
                new ContainerBuilder()
                    .setAccentColor(0xFF4FA3)

                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            "# ✦ ASTER / AUTORESPONDER\n" +
                            "### 🟢 Autoresponder Created\n\n" +
                            `**Trigger**\n\`${trigger}\`\n\n` +
                            `**Response Type**\n\`${type}\`\n\n` +
                            "-# Configuration saved successfully."
                        )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            "### ⚡ Matching\n" +
                            "The trigger is case-insensitive and can appear anywhere in a message."
                        )
                    );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ========================================================
        // REMOVE
        // ========================================================

        if (action === "remove") {

            const trigger =
                args.join(" ").trim();

            if (!trigger) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTORESPONDER\n" +
                                    "### ⚙ Usage\n\n" +
                                    "`,ar remove <trigger>`"
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
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
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTORESPONDER\n" +
                                    "### ⚠ Not Found\n\n" +
                                    `No autoresponder exists for \`${trigger}\`.`
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF4FA3)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# ✦ ASTER / AUTORESPONDER\n" +
                                "### 🔴 Autoresponder Removed\n\n" +
                                `Trigger \`${trigger}\` has been removed.`
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
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
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTORESPONDER\n" +
                                    "### ◌ No Autoresponders\n\n" +
                                    "This server currently has no configured autoresponders."
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
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
                    .setAccentColor(0xFF4FA3)

                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            "# ✦ ASTER / AUTORESPONDER\n" +
                            `### 📋 Active Triggers\n\n${entries}`
                        )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### 📊 Status\n` +
                            `**${guild.size}** active autoresponder${guild.size === 1 ? "" : "s"}`
                        )
                    );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
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
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTORESPONDER\n" +
                                    "### ◌ Nothing to Clear\n\n" +
                                    "There are no autoresponders configured."
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            clear(
                message.guild.id
            );

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF4FA3)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# ✦ ASTER / AUTORESPONDER\n" +
                                "### 🗑 Autoresponders Cleared\n\n" +
                                "All autoresponders for this server have been removed."
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ========================================================
        // GUIDE
        // ========================================================

        const container =
            new ContainerBuilder()
                .setAccentColor(0xFF4FA3)

                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "# ✦ ASTER / AUTORESPONDER\n" +
                        "### ⚡ Automatic Server Responses\n\n" +
                        "ASTER automatically responds whenever a configured trigger appears in a message."
                    )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "### ✦ Create\n\n" +
                        "`,ar add <trigger> text <response>`\n" +
                        "`,ar add <trigger> embed <text>`\n" +
                        "`,ar add <trigger> image` + **attach an image**\n" +
                        "`,ar add <trigger> gif` + **attach a GIF**"
                    )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "### ⚙ Manage\n\n" +
                        "`,ar remove <trigger>`\n" +
                        "`,ar list`\n" +
                        "`,ar clear`"
                    )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "### 🧪 Examples\n\n" +
                        "`,ar add toxy text TOXY MENTIONED 👀`\n" +
                        "`,ar add cat gif` + **attach `cat.gif`**\n" +
                        "`,ar add logo image` + **attach `logo.png`**"
                    )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "### 🔎 Matching Rules\n\n" +
                        "**Case-insensitive** · triggers can appear anywhere in a message · replies are supported\n\n" +
                        "-# Word boundaries are respected, so `toxy` does not trigger from `toxic`."
                    )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        "-# ✦ ASTER • Autoresponder System\n" +
                        "-# Administrator access required"
                    )
                );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};