const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/database");

const ACCENT = 0xFF4FA3;

// ========================================================
// UI
// ========================================================

function ui(title, content, mentions = {}) {
    return {
        components: [
            new ContainerBuilder()
                .setAccentColor(ACCENT)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ✦ ASTER / AUTO REACT\n` +
                        `### ${title}\n` +
                        content
                    )
                )
        ],
        flags: MessageFlags.IsComponentsV2,
        ...mentions
    };
}

// ========================================================
// COMMAND
// ========================================================

module.exports = {
    name: "autoreact",

    async execute(message, args) {
        const isAdmin = message.member.permissions.has(
            PermissionFlagsBits.Administrator
        );

        const isBooster = Boolean(message.member.premiumSince);
        const action = args[0]?.toLowerCase();

        const mentionedUser = message.mentions.users.first();

        const rawUserId =
            args[1] && /^\d{17,20}$/.test(args[1])
                ? args[1]
                : null;

        const targetUser =
            mentionedUser ||
            (
                rawUserId
                    ? await message.client.users
                        .fetch(rawUserId)
                        .catch(() => null)
                    : null
            );

        // ====================================================
        // LIST
        // ====================================================

        if (action === "list") {
            if (!isAdmin) {
                return message.reply(
                    ui(
                        "🔒 Access Denied",
                        `Administrator permission is required to view configured Auto Reactions.`
                    )
                );
            }

            const autoreacts = db.prepare(`
                SELECT user_id, emoji
                FROM autoreacts
                WHERE enabled = 1
                ORDER BY user_id ASC
            `).all();

            const existingMembers = autoreacts.filter(entry =>
                message.guild.members.cache.has(entry.user_id)
            );

            if (!existingMembers.length) {
                return message.reply(
                    ui(
                        "📋 Auto Reactions",
                        `No auto reactions are currently configured.\n\n` +
                        `-# Boosters can use \`,autoreact enable <:emoji>\` to configure their own.`
                    )
                );
            }

            const list = existingMembers
                .map((entry, index) =>
                    `**${index + 1}.** <@${entry.user_id}> → ${entry.emoji}`
                )
                .join("\n");

            return message.reply(
                ui(
                    "📋 Configured Reactions",
                    `${list}\n\n` +
                    `-# ${existingMembers.length} configured`
                , {
                    allowedMentions: {
                        parse: []
                    }
                })
            );
        }

        // ====================================================
        // INVALID ACTION
        // ====================================================

        if (action !== "enable" && action !== "disable") {
            return message.reply(
                ui(
                    "⚙ Usage",
                    `**Booster**\n` +
                    `\`,autoreact enable <:emoji>\`\n` +
                    `\`,autoreact disable\`\n\n` +

                    `**Administrator**\n` +
                    `\`,autoreact enable @user <:emoji>\`\n` +
                    `\`,autoreact enable USER_ID <:emoji>\`\n` +
                    `\`,autoreact disable @user\`\n` +
                    `\`,autoreact disable USER_ID\`\n` +
                    `\`,autoreact list\``
                )
            );
        }

        // ====================================================
        // DETERMINE MODE
        // ====================================================

        const isSelfMode =
            action === "disable"
                ? !args[1]
                : !targetUser;

        // ====================================================
        // BOOSTER SELF MODE
        // ====================================================

        if (isSelfMode) {
            if (!isBooster) {
                return message.reply(
                    ui(
                        "🚀 Booster Perk Required",
                        `You need to be **actively boosting this server** to configure your own Auto Reaction.\n\n` +
                        `-# Boost the server to unlock this perk.`
                    )
                );
            }

            // BOOSTER ENABLE
            if (action === "enable") {
                const emoji = args[1];

                if (!emoji) {
                    return message.reply(
                        ui(
                            "⚠ Missing Emoji",
                            `Please provide the emoji ASTER should react with.\n\n` +
                            `-# Example: \`,autoreact enable <:emoji>\``
                        )
                    );
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

                if (message.client.autoreacts) {
                    message.client.autoreacts.set(
                        message.author.id,
                        emoji
                    );
                }

                return message.reply(
                    ui(
                        "🟢 Booster Auto Reaction Enabled",
                        `**Target** <@${message.author.id}>\n` +
                        `**Reaction** ${emoji}\n\n` +
                        `-# Active while you are boosting.\n` +
                        `-# Run again with another emoji to change it.`,
                        {
                            allowedMentions: {
                                parse: []
                            }
                        }
                    )
                );
            }

            // BOOSTER DISABLE
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

                return message.reply(
                    ui(
                        "🔴 Auto Reaction Disabled",
                        `**Your Auto Reaction has been removed.**\n\n` +
                        `-# You can configure another reaction while boosting.`
                    )
                );
            }
        }

        // ====================================================
        // ADMIN TARGET MODE
        // ====================================================

        if (!isAdmin) {
            return message.reply(
                ui(
                    "🔒 Access Denied",
                    `You can only configure your **own** Auto Reaction if you are a server booster.\n\n` +
                    `-# Administrators can configure reactions for other members.`
                )
            );
        }

        if (!targetUser) {
            return message.reply(
                ui(
                    "⚠ Invalid User",
                    `Please provide a valid user mention or Discord user ID.`
                )
            );
        }

        // ====================================================
        // ADMIN ENABLE
        // ====================================================

        if (action === "enable") {
            const emoji = args[2];

            if (!emoji) {
                return message.reply(
                    ui(
                        "⚠ Missing Emoji",
                        `Please provide the emoji ASTER should react with.\n\n` +
                        `-# Example: \`,autoreact enable @user <:emoji>\``
                    )
                );
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

            return message.reply(
                ui(
                    "🟢 Enabled",
                    `**Target** <@${targetUser.id}>\n` +
                    `**Reaction** ${emoji}\n\n` +
                    `-# Auto Reaction configured successfully.\n` +
                    `-# Active while the target is boosting.`,
                    {
                        allowedMentions: {
                            parse: []
                        }
                    }
                )
            );
        }

        // ====================================================
        // ADMIN DISABLE
        // ====================================================

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

            return message.reply(
                ui(
                    "🔴 Disabled",
                    `**Target** <@${targetUser.id}>\n\n` +
                    `-# Automatic reactions removed for this user.`,
                    {
                        allowedMentions: {
                            parse: []
                        }
                    }
                )
            );
        }
    }
};