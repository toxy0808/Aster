const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/database");
const activityDB = require("../database/activityLogs");

const prefix = ",";

const introCooldowns = new Set();
const cooldowns = new Set();
const autoresponderCooldowns = new Map();

// ============================================================
// AUTO REACT TABLE
// ============================================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS autoreacts (
        user_id TEXT PRIMARY KEY,
        emoji TEXT,
        enabled INTEGER DEFAULT 1
    )
`).run();

// ============================================================
// MESSAGE CREATE
// ============================================================

module.exports = async (client, message) => {

    if (message.author.bot) return;

    if (!message.guild) return;

    // ========================================================
    // MESSAGE TRACKING
    // ========================================================
    // Track EVERY human guild message before any feature
    // can return from this handler.
    //
    // This is important for the 24H and 7D leaderboards.
    // ========================================================

    const userId = message.author.id;

    try {

        activityDB.prepare(`
            INSERT INTO activity_logs
            (user_id, type, amount)
            VALUES (?, ?, ?)
        `).run(
            userId,
            "chat",
            1
        );

        const user = db.prepare(
            "SELECT * FROM users WHERE user_id = ?"
        ).get(userId);

        if (!user) {

            db.prepare(`
                INSERT INTO users
                (user_id, messages, voice_time, xp, level)
                VALUES (?, 1, 0, 10, 1)
            `).run(userId);

        } else {

            const xpGain =
                Math.floor(Math.random() * 11) + 5;

            const newXp =
                user.xp + xpGain;

            const newLevel =
                Math.floor(
                    Math.sqrt(newXp / 100)
                ) + 1;

            db.prepare(`
                UPDATE users
                SET
                    messages = messages + 1,
                    xp = ?,
                    level = ?
                WHERE user_id = ?
            `).run(
                newXp,
                newLevel,
                userId
            );
        }

    } catch (error) {

        console.error(
            "MESSAGE TRACKING ERROR:",
            error
        );
    }

    // ========================================================
    // AUTO REACTIONS
    // ========================================================

    if (!client.autoreacts) {

        client.autoreacts = new Map(
            db.prepare(`
                SELECT user_id, emoji
                FROM autoreacts
                WHERE enabled = 1
            `)
            .all()
            .map(row => [
                row.user_id,
                row.emoji
            ])
        );
    }

    const emoji =
        client.autoreacts.get(
            message.author.id
        );

    if (emoji) {

        message
            .react(emoji)
            .catch(() => {});
    }

    // ========================================================
    // AUTO RESPONDER
    // ========================================================

    const autoresponderGuild =
        client.autoresponders?.autoresponders?.get(
            message.guild.id
        );

    if (
        autoresponderGuild &&
        autoresponderGuild.size > 0
    ) {

        const messageContent =
            message.content.trim();

        if (messageContent) {

            const responses =
                [...autoresponderGuild.entries()]
                    .sort(
                        (a, b) =>
                            b[0].length -
                            a[0].length
                    );

            for (
                const [trigger, response]
                of responses
            ) {

                const escapedTrigger =
                    trigger.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        "\\$&"
                    );

                const triggerRegex =
                    new RegExp(
                        `(^|\\s)${escapedTrigger}(?=\\s|$|[!?.,:;'"()\\[\\]{}<>])`,
                        "i"
                    );

                if (
                    !triggerRegex.test(
                        messageContent
                    )
                ) {
                    continue;
                }

                // 5 second cooldown
                const key =
                    `${message.guild.id}:${message.author.id}:${trigger}`;

                if (
                    autoresponderCooldowns.has(key)
                ) {
                    continue;
                }

                autoresponderCooldowns.set(
                    key,
                    true
                );

                setTimeout(() => {
                    autoresponderCooldowns.delete(key);
                }, 5000);

                try {

                    // TEXT
                    if (
                        response.type === "text"
                    ) {

                        await message.reply({
                            content: response.content
                        });
                    }

                    // IMAGE / GIF
                    else if (
                        response.type === "image" ||
                        response.type === "gif"
                    ) {

                        await message.reply({
                            files: [
                                {
                                    attachment: response.content
                                }
                            ]
                        });
                    }

                    // COMPONENTS V2
                    else if (
                        response.type === "embed"
                    ) {

                        const container =
                            new ContainerBuilder()
                                .setAccentColor(0xFF006E)

                                .addTextDisplayComponents(
                                    new TextDisplayBuilder()
                                        .setContent(
                                            `# ✦ ASTER\n\n${response.content}`
                                        )
                                )

                                .addSeparatorComponents(
                                    new SeparatorBuilder()
                                )

                                .addTextDisplayComponents(
                                    new TextDisplayBuilder()
                                        .setContent(
                                            "-# ASTER • Autoresponder"
                                        )
                                );

                        await message.reply({
                            components: [
                                container
                            ],
                            flags:
                                MessageFlags.IsComponentsV2
                        });
                    }

                } catch (error) {

                    console.error(
                        "AUTO-RESPONDER ERROR:",
                        error
                    );
                }

                // Only one autoresponder per message
                break;
            }
        }
    }

    // ========================================================
    // ASTER INTRO
    // ========================================================
    //
    // IMPORTANT:
    // The intro cooldown ONLY controls the intro response.
    // It must NEVER stop message tracking.
    // ========================================================

    if (
        message.mentions.users.has(
            client.user.id
        ) &&
        !message.reference
    ) {

        const isAdministrator =
            message.member.permissions.has(
                PermissionFlagsBits.Administrator
            );

        const introOnCooldown =
            introCooldowns.has(
                message.author.id
            );

        if (
            !isAdministrator &&
            !introOnCooldown
        ) {

            introCooldowns.add(
                message.author.id
            );

            setTimeout(() => {

                introCooldowns.delete(
                    message.author.id
                );

            }, 10 * 60 * 1000);

            const container =
                new ContainerBuilder()
                    .setAccentColor(0xFF006E)

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "# ✦ ASTER\n" +
                                "### Activity • Reputation • Rewards\n\n" +
                                "Your community assistant for tracking activity, " +
                                "competition, reputation and server rewards."
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "### 📊 Activity\n\n" +
                                "Track messages, XP, levels and voice activity.\n\n" +
                                "`,activity` • `,rank` • `,activitylb`"
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "### 🏆 Leaderboards\n\n" +
                                "Live **24H** and **7D** activity rankings.\n" +
                                "Top performers can earn configurable winner roles."
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "### ✨ Reputation\n\n" +
                                "Give reputation with `+rep @user`.\n" +
                                "Remove reputation with `-rep @user`.\n\n" +
                                "Reputation can unlock configurable role rewards."
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "### ⚙️ Server Features\n\n" +
                                "• Automatic reactions\n" +
                                "• Activity tracking & XP\n" +
                                "• Activity leaderboard rewards\n" +
                                "• Reputation rewards\n" +
                                "• Staff & Funder reputation limits\n" +
                                "• Custom server configuration"
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "### 🚀 Getting Started\n\n" +
                                "Use `,help` to explore the available commands.\n" +
                                "Administrators can use `,config` to customize ASTER."
                            )
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                "— **ASTER** • Built for communities"
                            )
                    );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }

    // ========================================================
    // +REP / -REP
    // ========================================================

    const content =
        message.content.trim();

    if (
        content
            .toLowerCase()
            .startsWith("+rep") ||

        content
            .toLowerCase()
            .startsWith("-rep")
    ) {

        const isNegative =
            content
                .toLowerCase()
                .startsWith("-rep");

        const args =
            content
                .slice(4)
                .trim()
                .split(/ +/)
                .filter(Boolean);

        const command =
            client.commands.get("rep");

        if (!command) return;

        if (isNegative) {
            args.unshift("negative");
        }

        try {

            await command.execute(
                message,
                args
            );

        } catch (error) {

            console.error(
                "COMMAND ERROR:",
                error
            );

            message.reply(
                "Command error, check console."
            );
        }

        return;
    }

    // ========================================================
    // PREFIX COMMANDS
    // ========================================================

    if (
        !message.content.startsWith(
            prefix
        )
    ) {
        return;
    }

    const args =
        message.content
            .slice(prefix.length)
            .trim()
            .split(/ +/);

    const commandName =
        args
            .shift()
            .toLowerCase();

    console.log(
        "COMMAND:",
        commandName
    );

    let command =
        client.commands.get(
            commandName
        );

    if (!command) {

        command =
            [...client.commands.values()]
                .find(cmd =>
                    cmd.aliases &&
                    cmd.aliases.includes(
                        commandName
                    )
                );
    }

    if (!command) return;

    try {

        await command.execute(
            message,
            args
        );

    } catch (error) {

        console.error(
            "COMMAND ERROR:",
            error
        );

        message.reply(
            "Command error, check console."
        );
    }

    // ========================================================
    // MESSAGE COOLDOWN
    // ========================================================

    if (
        cooldowns.has(
            message.author.id
        )
    ) {
        return;
    }
};