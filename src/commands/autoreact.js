const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/database");

module.exports = {
    name: "autoreact",

    async execute(message, args) {

        // ========================================================
        // HELPERS
        // ========================================================

        const isAdmin = message.member.permissions.has(
            PermissionFlagsBits.Administrator
        );

        const isBooster = Boolean(message.member.premiumSince);

        const action = args[0]?.toLowerCase();

        // Mention OR raw Discord user ID
        const mentionedUser = message.mentions.users.first();

        const rawUserId =
            args[1] && /^\d{17,20}$/.test(args[1])
                ? args[1]
                : null;

        const targetUser =
            mentionedUser ||
            (rawUserId
                ? await message.client.users.fetch(rawUserId).catch(() => null)
                : null);

        // ========================================================
        // LIST
        // ========================================================

        if (action === "list") {

            if (!isAdmin) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTO REACT\n" +
                                    "### 🔒 Access Denied\n" +
                                    "Administrator permission is required to view configured Auto Reactions."
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const autoreacts = db.prepare(`
                SELECT user_id, emoji
                FROM autoreacts
                WHERE enabled = 1
                ORDER BY user_id ASC
            `).all();

            // Only keep users who are currently in this server
            const existingMembers = autoreacts.filter(entry =>
                message.guild.members.cache.has(entry.user_id)
            );

            if (!existingMembers.length) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTO REACT\n" +
                                    "### 📋 Auto Reactions\n\n" +
                                    "No auto reactions are currently configured for members of this server.\n\n" +
                                    "-# Boosters can use `,autoreact enable <:emoji>` to configure their own reaction."
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const list = existingMembers
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
                                `\n\n-# ${existingMembers.length} auto reaction${existingMembers.length === 1 ? "" : "s"} configured.`
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

        if (
            action !== "enable" &&
            action !== "disable"
        ) {
            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF4FA3)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# ✦ ASTER / AUTO REACT\n" +
                                "### ⚙ Usage\n\n" +

                                "**Server Booster**\n" +
                                "`,autoreact enable <:emoji>`\n" +
                                "`,autoreact disable`\n\n" +

                                "**Administrator**\n" +
                                "`,autoreact enable @user <:emoji>`\n" +
                                "`,autoreact enable USER_ID <:emoji>`\n" +
                                "`,autoreact disable @user`\n" +
                                "`,autoreact disable USER_ID`\n" +
                                "`,autoreact list`"
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ========================================================
        // DETERMINE MODE
        // ========================================================

        /*
         * BOOSTER SELF MODE
         *
         * ,autoreact enable <:emoji>
         * ,autoreact disable
         *
         * ADMIN TARGET MODE
         *
         * ,autoreact enable @user <:emoji>
         * ,autoreact enable USER_ID <:emoji>
         * ,autoreact disable @user
         * ,autoreact disable USER_ID
         */

        const isSelfMode =
            action === "disable"
                ? !args[1]
                : !targetUser;

        // ========================================================
        // BOOSTER SELF MODE
        // ========================================================

        if (isSelfMode) {

            // Only boosters can configure themselves
            if (!isBooster) {
                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTO REACT\n" +
                                    "### 🚀 Booster Perk Required\n\n" +
                                    "You need to be **actively boosting this server** to configure your own Auto Reaction.\n\n" +
                                    "-# Boost the server and you'll be able to assign your own reaction."
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // ----------------------------------------------------
            // BOOSTER ENABLE
            // ----------------------------------------------------

            if (action === "enable") {

                const emoji = args[1];

                if (!emoji) {
                    return message.reply({
                        components: [
                            new ContainerBuilder()
                                .setAccentColor(0xFF4FA3)
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent(
                                        "# ✦ ASTER / AUTO REACT\n" +
                                        "### ⚠ Missing Emoji\n\n" +
                                        "Please provide the emoji ASTER should react with.\n\n" +
                                        "-# Example: `,autoreact enable <:emoji>`"
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
                    message.author.id,
                    emoji,
                    emoji
                );

                // Update in-memory cache if it exists
                if (message.client.autoreacts) {
                    message.client.autoreacts.set(
                        message.author.id,
                        emoji
                    );
                }

                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTO REACT\n" +
                                    "### 🟢 Booster Auto Reaction Enabled\n\n" +
                                    `**Target**  <@${message.author.id}>\n` +
                                    `**Reaction**  ${emoji}\n\n` +
                                    "-# ASTER will automatically react to your messages while you are boosting the server.\n" +
                                    "-# Run this command again with another emoji to change it."
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: {
                        parse: []
                    }
                });
            }

            // ----------------------------------------------------
            // BOOSTER DISABLE
            // ----------------------------------------------------

            if (action === "disable") {

                db.prepare(`
                    DELETE FROM autoreacts
                    WHERE user_id = ?
                `).run(message.author.id);

                if (message.client.autoreacts) {
                    message.client.autoreacts.delete(
                        message.author.id
                    );
                }

                return message.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xFF4FA3)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    "# ✦ ASTER / AUTO REACT\n" +
                                    "### 🔴 Auto Reaction Disabled\n\n" +
                                    "**Your Auto Reaction has been removed.**\n\n" +
                                    "-# You can configure another reaction at any time while boosting."
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        // ========================================================
        // ADMIN TARGET MODE
        // ========================================================

        if (!isAdmin) {
            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF4FA3)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# ✦ ASTER / AUTO REACT\n" +
                                "### 🔒 Access Denied\n\n" +
                                "You can only configure your **own** Auto Reaction if you are a server booster.\n\n" +
                                "-# Administrators can configure Auto Reactions for other members."
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (!targetUser) {
            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF4FA3)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# ✦ ASTER / AUTO REACT\n" +
                                "### ⚠ Invalid User\n\n" +
                                "Please provide a valid user mention or Discord user ID."
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ========================================================
        // ADMIN ENABLE
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
                                    "### ⚠ Missing Emoji\n\n" +
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
                targetUser.id,
                emoji,
                emoji
            );

            if (message.client.autoreacts) {
                message.client.autoreacts.set(
                    targetUser.id,
                    emoji
                );
            }

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF4FA3)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# ✦ ASTER / AUTO REACT\n" +
                                "### 🟢 Enabled\n\n" +
                                `**Target**  <@${targetUser.id}>\n` +
                                `**Reaction**  ${emoji}\n\n` +
                                "-# Auto Reaction has been configured successfully.\n" +
                                "-# The reaction is active while the target is boosting the server."
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
        // ADMIN DISABLE
        // ========================================================

        if (action === "disable") {

            db.prepare(`
                DELETE FROM autoreacts
                WHERE user_id = ?
            `).run(targetUser.id);

            if (message.client.autoreacts) {
                message.client.autoreacts.delete(
                    targetUser.id
                );
            }

            return message.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xFF4FA3)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                "# ✦ ASTER / AUTO REACT\n" +
                                "### 🔴 Disabled\n\n" +
                                `**Target**  <@${targetUser.id}>\n\n` +
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
    }
};