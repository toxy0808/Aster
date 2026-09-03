const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/database");

const prefix = ",";

const introCooldowns = new Set();
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

    // Ignore bots
    if (message.author.bot) return;

    // Ignore DMs
    if (!message.guild) return;

    const userId = message.author.id;

    // ========================================================
    // MESSAGE ACTIVITY TRACKING
    // ========================================================

    try {

        // Log message activity
        db.prepare(`
            INSERT INTO activity_logs
                (user_id, type, amount)
            VALUES (?, 'chat', 1)
        `).run(userId);

        // Create user or update existing user
        db.prepare(`
            INSERT INTO users
                (user_id, messages, voice_time, xp, level)
            VALUES (?, 1, 0, 10, 1)

            ON CONFLICT(user_id) DO UPDATE SET
                messages = users.messages + 1,
                xp = users.xp + 10,
                level = CAST(
                    SQRT((users.xp + 10) / 100.0)
                    AS INTEGER
                ) + 1
        `).run(userId);

        console.log("✦ ASTER TRACKED:", userId);

    } catch (error) {

        console.error(
            "MESSAGE TRACKING ERROR:",
            error.stack || error
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
        client.autoreacts.get(userId);

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

                // ====================================================
                // AUTORESPONDER COOLDOWN
                // ====================================================

                const key =
                    `${message.guild.id}:${userId}:${trigger}`;

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

                    autoresponderCooldowns.delete(
                        key
                    );

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
            introCooldowns.has(userId);

        if (
            !isAdministrator &&
            !introOnCooldown
        ) {

            introCooldowns.add(userId);

            setTimeout(() => {

                introCooldowns.delete(userId);

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

            try {

                await message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });

            } catch (error) {

                console.error(
                    "INTRO ERROR:",
                    error
                );
            }

            return;
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

            try {

                await message.reply(
                    "Command error, check console."
                );

            } catch {}
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

        try {

            await message.reply(
                "Command error, check console."
            );

        } catch {}
    }
};