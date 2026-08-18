const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require("discord.js");

const {
    symbols,
    timestamps
} = require("./asterUI");

// ========================================================
// TIME FORMATTER
// ========================================================

function formatTime(minutes) {

    minutes = Number(minutes) || 0;

    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;

    const parts = [];

    if (days > 0) {
        parts.push(`${days}d`);
    }

    if (hours > 0) {
        parts.push(`${hours}h`);
    }

    if (mins > 0) {
        parts.push(`${mins}m`);
    }

    return parts.length
        ? parts.join(" ")
        : "0m";
}

// ========================================================
// CLICKABLE USER TAG — NO PING
// ========================================================

function userTag(user) {

    const username =
        user.username || "Unknown";

    return `[${username}](https://discord.com/users/${user.user_id})`;
}

// ========================================================
// ACTIVITY UI
// ========================================================

function createActivityEmbed(
    chatUsers = [],
    voiceUsers = [],
    period,
    resetTimestamp = null
) {

    const emojis = {
        logo: "<a:Weedleaf2:1459619037980921887>",
        activity: "<a:Fire8:1459590813410660564>",
        ruler: "<a:WeedLeaf:1459620147424788703>",
        live: "<a:Dance:1459730182553338109>",

        rank1: "<:1_n:1522913562551652483>",
        rank2: "<:2_n:1522914098470453330>",
        rank3: "<:3_n:1522914202740850819>",
        rank4: "<:4_n:1522914291504910348>",
        rank5: "<:5_n:1522914328766976111>"
    };

    const ranks = [
        emojis.rank1,
        emojis.rank2,
        emojis.rank3,
        emojis.rank4,
        emojis.rank5
    ];

    const safeChatUsers =
        Array.isArray(chatUsers)
            ? chatUsers
            : [];

    const safeVoiceUsers =
        Array.isArray(voiceUsers)
            ? voiceUsers
            : [];

    const is24h = period === "24h";

    // ========================================================
    // CHAT LEADERBOARD
    // ========================================================

    const chatText = safeChatUsers.length
        ? safeChatUsers
            .slice(0, 5)
            .map((user, index) =>
                `${ranks[index]} **${userTag(user)}**\n` +
                `${emojis.activity} **${(Number(user.messages) || 0).toLocaleString()}** messages`
            )
            .join("\n\n")
        : `${symbols.info} No chat activity recorded.`;

    // ========================================================
    // VOICE LEADERBOARD
    // ========================================================

    const voiceText = safeVoiceUsers.length
        ? safeVoiceUsers
            .slice(0, 5)
            .map((user, index) =>
                `${ranks[index]} **${userTag(user)}**\n` +
                `${emojis.ruler} **${formatTime(user.voice_time)}**`
            )
            .join("\n\n")
        : `${symbols.info} No voice activity recorded.`;

    // ========================================================
    // PERIOD
    // ========================================================

    const periodLabel =
        is24h
            ? "24 HOURS"
            : "7 DAYS";

    const periodDescription =
        is24h
            ? "Daily rankings • Competitive activity"
            : "Weekly rankings • Competitive activity";

    // ========================================================
    // CONTAINER
    // ========================================================

    const container =
        new ContainerBuilder()
            .setAccentColor(0xFF4DA6);

    // ========================================================
    // HEADER
    // ========================================================

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `# ${emojis.logo} ASTER / ACTIVITY\n` +
            `### ${emojis.live} LIVE • ${periodLabel}\n` +
            `-# ${periodDescription}`
        )
    );

    container.addSeparatorComponents(
        new SeparatorBuilder()
    );

    // ========================================================
    // RESET INFORMATION
    // ========================================================

    if (resetTimestamp) {

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.time} Period Reset\n` +
                `**Resets:** <t:${resetTimestamp}:R>\n` +
                `**Reset time:** <t:${resetTimestamp}:F>`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );
    }

    // ========================================================
    // CHAT KINGS
    // ========================================================

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### ${emojis.activity} Chat Kings\n\n` +
            chatText
        )
    );

    container.addSeparatorComponents(
        new SeparatorBuilder()
    );

    // ========================================================
    // VOICE KINGS
    // ========================================================

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### ${emojis.ruler} Voice Kings\n\n` +
            voiceText
        )
    );

    container.addSeparatorComponents(
        new SeparatorBuilder()
    );

    // ========================================================
    // FOOTER
    // ========================================================

    const updateText =
        is24h
            ? "Daily reset at midnight"
            : "Weekly reset every Monday";

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `-# ${symbols.live} Live leaderboard • ${updateText}\n` +
            `-# ${symbols.time} Updated ${timestamps.now()}\n` +
            `-# ${symbols.brand} ASTER • Activity System`
        )
    );

    return container;
}

module.exports = createActivityEmbed;