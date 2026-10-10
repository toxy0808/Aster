const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/database");

const PREFIX = ",";

const INTRO_COOLDOWN = 10 * 60 * 1000;
const AUTORESPONDER_COOLDOWN = 5000;

const introCooldowns = new Set();
const autoresponderCooldowns = new Set();

// ============================================================
// DATABASE — MESSAGE ACTIVITY
// Keep this for existing database/dashboard dependencies.
// ============================================================

const insertChatActivity = db.prepare(`
    INSERT INTO activity_logs (user_id, type, amount)
    VALUES (?, 'chat', 1)
`);

const upsertMessageUser = db.prepare(`
    INSERT INTO users (user_id, messages, voice_time, xp, level)
    VALUES (?, 1, 0, 10, 1)

    ON CONFLICT(user_id) DO UPDATE SET
        messages = users.messages + 1,
        xp = users.xp + 10,
        level = CAST(
            SQRT((users.xp + 10) / 100.0)
            AS INTEGER
        ) + 1
`);

const trackMessageActivity = db.transaction((userId) => {
    insertChatActivity.run(userId);
    upsertMessageUser.run(userId);
});

// ============================================================
// HELPERS
// ============================================================

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createTriggerRegex(trigger) {
    return new RegExp(
        `(^|\\s)${escapeRegex(trigger)}(?=\\s|$|[!?.,:;"'()\\[\\]{}<>])`,
        "i"
    );
}

function createAsterContainer() {
    return new ContainerBuilder()
        .setAccentColor(0xFF006E);
}

function addText(container, content) {
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(content)
    );
}

function addSeparator(container) {
    container.addSeparatorComponents(
        new SeparatorBuilder()
    );
}

// ============================================================
// ASTER INTRO
// ============================================================

function buildIntro() {
    const container = createAsterContainer();

    addText(
        container,
        "# ✦ ASTER\n\n" +
        "### Community • Reputation • Rewards\n\n" +
        "Your community assistant for reputation, " +
        "server rewards and customization."
    );

    addSeparator(container);

    addText(
        container,
        "### ✨ Reputation\n\n" +
        "Give reputation with `+rep @user`.\n" +
        "Remove reputation with `-rep @user`.\n\n" +
        "Reputation can unlock configurable role rewards."
    );

    addSeparator(container);

    addText(
        container,
        "### ⚙️ Server Features\n\n" +
        "• Automatic reactions for boosters\n" +
        "• Reputation rewards and limits\n" +
        "• Custom server configuration\n" +
        "• Configurable autoresponders"
    );

    addSeparator(container);

    addText(
        container,
        "### 🚀 Getting Started\n\n" +
        "Use `,help` to explore available commands.\n" +
        "Administrators can use `,config` to customize ASTER."
    );

    addSeparator(container);

    addText(
        container,
        "-# ASTER • Built for communities"
    );

    return container;
}

// ============================================================
// AUTO-REACTIONS — BOOSTER PERK
// ============================================================

function getAutoreacts(client) {
    if (!client.autoreacts) {
        client.autoreacts = new Map(
            db.prepare(`
                SELECT user_id, emoji
                FROM autoreacts
                WHERE enabled = 1
            `)
                .all()
                .map(({ user_id, emoji }) => [user_id, emoji])
        );
    }

    return client.autoreacts;
}

// ============================================================
// AUTO-RESPONDER
// ============================================================

async function handleAutoresponder(client, message, userId) {
    const responders =
        client.autoresponders?.autoresponders?.get(
            message.guild.id
        );

    if (!responders?.size) return;

    const content = message.content.trim();

    if (!content) return;

    // Check longer triggers first.
    const entries = [...responders.entries()].sort(
        (a, b) => b[0].length - a[0].length
    );

    for (const [trigger, response] of entries) {
        if (!createTriggerRegex(trigger).test(content)) {
            continue;
        }

        const cooldownKey =
            `${message.guild.id}:${userId}:${trigger}`;

        if (autoresponderCooldowns.has(cooldownKey)) {
            continue;
        }

        autoresponderCooldowns.add(cooldownKey);

        setTimeout(() => {
            autoresponderCooldowns.delete(cooldownKey);
        }, AUTORESPONDER_COOLDOWN);

        try {
            switch (response.type) {
                case "text":
                    await message.reply({
                        content: response.content
                    });
                    break;

                case "image":
                case "gif":
                    await message.reply({
                        files: [response.content]
                    });
                    break;

                case "embed": {
                    const container = createAsterContainer();

                    addText(
                        container,
                        `# ✦ ASTER\n\n${response.content}`
                    );

                    addSeparator(container);

                    addText(
                        container,
                        "-# ASTER • Autoresponder"
                    );

                    await message.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });

                    break;
                }

                default:
                    console.warn(
                        `Unknown autoresponder type: ${response.type}`
                    );
            }
        } catch (error) {
            console.error("AUTO-RESPONDER ERROR:", error);
        }

        // Only one autoresponder per message.
        return;
    }
}

// ============================================================
// REPUTATION
// ============================================================

async function handleReputation(client, message, content) {
    const normalized = content.toLowerCase();

    const isPositive = normalized.startsWith("+rep");
    const isNegative = normalized.startsWith("-rep");

    if (!isPositive && !isNegative) {
        return false;
    }

    const args = content
        .slice(4)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const command = client.commands.get("rep");

    if (!command) return true;

    if (isNegative) {
        args.unshift("negative");
    }

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error("REPUTATION COMMAND ERROR:", error);

        try {
            await message.reply(
                "Command error, check console."
            );
        } catch {}
    }

    return true;
}

// ============================================================
// PREFIX COMMANDS
// ============================================================

async function handlePrefixCommand(client, message) {
    if (!message.content.startsWith(PREFIX)) {
        return;
    }

    const args = message.content
        .slice(PREFIX.length)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    // Ignore a bare prefix.
    if (!args.length) return;

    const commandName = args.shift().toLowerCase();

    let command = client.commands.get(commandName);

    if (!command) {
        command = [...client.commands.values()].find(
            cmd => cmd.aliases?.includes(commandName)
        );
    }

    if (!command) return;

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(
            `COMMAND ERROR (${commandName}):`,
            error
        );

        try {
            await message.reply(
                "Command error, check console."
            );
        } catch {}
    }
}

// ============================================================
// MESSAGE CREATE
// ============================================================

module.exports = async (client, message) => {
    // Ignore bots and DMs.
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;

    // --------------------------------------------------------
    // Message activity tracking
    // --------------------------------------------------------

    try {
        trackMessageActivity(userId);
    } catch (error) {
        console.error(
            "MESSAGE TRACKING ERROR:",
            error.stack || error
        );
    }

    // --------------------------------------------------------
    // Booster auto-reactions
    // --------------------------------------------------------

    try {
        const emoji = getAutoreacts(client).get(userId);

        if (emoji && message.member?.premiumSince) {
            await message.react(emoji).catch(() => {});
        }
    } catch (error) {
        console.error("AUTOREACTION ERROR:", error);
    }

    // --------------------------------------------------------
    // Autoresponders
    // --------------------------------------------------------

    await handleAutoresponder(client, message, userId);

    // --------------------------------------------------------
    // ASTER introduction
    // --------------------------------------------------------

    if (
        client.user &&
        message.mentions.users.has(client.user.id) &&
        !message.reference
    ) {
        const isAdministrator =
            message.member?.permissions.has(
                PermissionFlagsBits.Administrator
            ) ?? false;

        if (
            isAdministrator ||
            !introCooldowns.has(userId)
        ) {
            if (!isAdministrator) {
                introCooldowns.add(userId);

                setTimeout(() => {
                    introCooldowns.delete(userId);
                }, INTRO_COOLDOWN);
            }

            try {
                await message.reply({
                    components: [buildIntro()],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.error("INTRO ERROR:", error);
            }

            return;
        }
    }

    // --------------------------------------------------------
    // Reputation commands
    // --------------------------------------------------------

    const content = message.content.trim();

    if (/^[+-]rep(?:\s|$)/i.test(content)) {
        await handleReputation(client, message, content);
        return;
    }

    // --------------------------------------------------------
    // Remaining prefix commands
    // --------------------------------------------------------

    await handlePrefixCommand(client, message);
};