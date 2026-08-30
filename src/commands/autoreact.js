const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/database");

module.exports = {
    name: "autoreact",

    async execute(message, args) {

        // ========================================================
        // PERMISSIONS
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
                                "# ✦ ASTER / AUTO REACT\n" +
                                "### 🔒 Access Denied\n" +
                                "Administrator permission is required to configure Auto React."
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ========================================================
        // ARGUMENTS
        // ========================================================

        const action = args[0]?.toLowerCase();

        // ========================================================
        // LIST
        // ========================================================

        if (action === "list") {

            const autoreacts = db.prepare(`
                SELECT user_id, emoji
                FROM autoreacts
                WHERE enabled = 1
                ORDER BY user_id ASC
            `).all();

            if (!autoreacts.length) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTO REACT\n" +
                                    "### 📋 Auto Reactions\n\n" +
                                    "No auto reactions are currently configured.\n\n" +
                                    "-# Use `,autoreact enable @user <:emoji>` to add one."
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const list = autoreacts
                .map((entry, index) =>
                    `**${index + 1}.** <@${entry.user_id}> → ${entry.emoji}`
                )
                .join("\n");

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF4FA3)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# ✦ ASTER / AUTO REACT\n" +
                                "### 📋 Configured Reactions\n\n" +
                                list +
                                `\n\n-# ${autoreacts.length} auto reaction${autoreacts.length === 1 ? "" : "s"} configured.`
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: []
                }
            });
        }

        // ========================================================
        // USER
        // ========================================================

        const user =
            message.mentions.users.first() ||
            await message.client.users.fetch(args[1]).catch(() => null);

        // ========================================================
        // USAGE
        // ========================================================

        if (!action || !user) {

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF4FA3)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# ✦ ASTER / AUTO REACT\n" +
                                "### ⚙ Usage\n\n" +
                                "`,autoreact enable @user <:emoji>`\n" +
                                "`,autoreact disable @user`\n" +
                                "`,autoreact list`\n\n" +
                                "-# Auto React is an administrator-only feature."
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ========================================================
        // ENABLE
        // ========================================================

        if (action === "enable") {

            const emoji = args[2];

            if (!emoji) {

                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTO REACT\n" +
                                    "### ⚠ Missing Emoji\n" +
                                    "Please provide the emoji ASTER should react with.\n\n" +
                                    "-# Example: `,autoreact enable @user <:emoji>`"
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            db.prepare(`
                INSERT INTO autoreacts (
                    user_id,
                    emoji,
                    enabled
                )
                VALUES (?, ?, 1)
                ON CONFLICT(user_id)
                DO UPDATE SET
                    emoji = ?,
                    enabled = 1
            `).run(
                user.id,
                emoji,
                emoji
            );

            message.client.autoreacts.set(
                user.id,
                emoji
            );

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF4FA3)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# ✦ ASTER / AUTO REACT\n" +
                                "### 🟢 Enabled\n\n" +
                                `**Target**  <@${user.id}>\n` +
                                `**Reaction**  ${emoji}\n\n` +
                                "-# ASTER will automatically react to this user's messages."
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: []
                }
            });
        }

        // ========================================================
        // DISABLE
        // ========================================================

        if (action === "disable") {

            db.prepare(`
                DELETE FROM autoreacts
                WHERE user_id = ?
            `).run(user.id);

            message.client.autoreacts.delete(
                user.id
            );

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF4FA3)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# ✦ ASTER / AUTO REACT\n" +
                                "### 🔴 Disabled\n\n" +
                                `**Target**  <@${user.id}>\n\n` +
                                "-# Automatic reactions have been removed for this user."
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: []
                }
            });
        }

        // ========================================================
        // INVALID ACTION
        // ========================================================

        return message.reply({
            components: [
                new ContainerBuilder()
                    .setAccentColor(0xFF4FA3)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            "# ✦ ASTER / AUTO REACT\n" +
                            "### ⚠ Invalid Action\n\n" +
                            "Use:\n" +
                            "`,autoreact enable @user <:emoji>`\n" +
                            "`,autoreact disable @user`\n" +
                            "`,autoreact list`"
                        )
                    )
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
