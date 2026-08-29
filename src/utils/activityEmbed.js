const {
    ContainerBuilder
} = require("discord.js");

const symbols = require("./asterUI/symbols");
const timestamps = require("./asterUI/timestamps");
const styles = require("./asterUI/styles");
const sections = require("./asterUI/sections");

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
// RANK ICONS
// ========================================================

const ranks = [
    "<:1_n:1522913562551652483>",
    "<:2_n:1522914098470453330>",
    "<:3_n:1522914202740850819>",
    "<:4_n:1522914291504910348>",
    "<:5_n:1522914328766976111>"
];

// ========================================================
// ACTIVITY UI
// ========================================================

function createActivityEmbed(
    chatUsers = [],
    voiceUsers = [],
    period,
    resetTimestamp = null
) {

    const safeChatUsers =
        Array.isArray(chatUsers)
            ? chatUsers
            : [];

    const safeVoiceUsers =
        Array.isArray(voiceUsers)
            ? voiceUsers
            : [];

    const is24h =
        period === "24h";

    // ====================================================
    // PERIOD
    // ====================================================

    const periodLabel =
        is24h
            ? "24 HOURS"
            : "7 DAYS";

    const periodDescription =
        is24h
            ? "Daily activity rankings"
            : "Weekly activity rankings";

    // ====================================================
    // CHAT LEADERBOARD
    // ====================================================

    const chatText =
        safeChatUsers.length
            ? safeChatUsers
                .slice(0, 5)
                .map((user, index) => {

                    const messages =
                        (
                            Number(user.messages) || 0
                        ).toLocaleString();

                    return (
                        `${ranks[index]} **${userTag(user)}**\n` +
                        `-# ${symbols.chat} **${messages}** messages`
                    );
                })
                .join("\n\n")
            : `${symbols.info} *No chat activity recorded yet.*`;

    // ====================================================
    // VOICE LEADERBOARD
    // ====================================================

    const voiceText =
        safeVoiceUsers.length
            ? safeVoiceUsers
                .slice(0, 5)
                .map((user, index) => {

                    return (
                        `${ranks[index]} **${userTag(user)}**\n` +
                        `-# ${symbols.voice} **${formatTime(user.voice_time)}**`
                    );
                })
                .join("\n\n")
            : `${symbols.info} *No voice activity recorded yet.*`;

    // ====================================================
    // CONTAINER
    // ====================================================

    const container =
        new ContainerBuilder()
            .setAccentColor(0xFF4DA6);

    // ====================================================
    // HEADER
    // ====================================================

    container.addTextDisplayComponents(
        sections.header(
            `${styles.brand.name} / ACTIVITY`,
            styles.brand.symbol
        )
    );

    container.addTextDisplayComponents(
        sections.text(
            `### ${symbols.online} ${periodLabel}\n` +
            `-# ${periodDescription} ${styles.text.bullet} Live leaderboard`
        )
    );

    container.addSeparatorComponents(
        sections.separator()
    );

    // ====================================================
    // RESET
    // ====================================================

    if (resetTimestamp) {

        container.addTextDisplayComponents(
            sections.text(
                `-# ${symbols.time} NEXT RESET\n` +
                `**<t:${resetTimestamp}:R>** ${styles.text.bullet} ` +
                `<t:${resetTimestamp}:F>`
            )
        );

        container.addSeparatorComponents(
            sections.separator()
        );
    }

    // ====================================================
    // CHAT KINGS
    // ====================================================

    container.addTextDisplayComponents(
        sections.header(
            "CHAT KINGS",
            symbols.chat
        )
    );

    container.addTextDisplayComponents(
        sections.text(
            `-# Most active members by messages\n\n` +
            chatText
        )
    );

    container.addSeparatorComponents(
        sections.separator()
    );

    // ====================================================
    // VOICE KINGS
    // ====================================================

    container.addTextDisplayComponents(
        sections.header(
            "VOICE KINGS",
            symbols.voice
        )
    );

    container.addTextDisplayComponents(
        sections.text(
            `-# Most active members by voice time\n\n` +
            voiceText
        )
    );

    container.addSeparatorComponents(
        sections.separator()
    );

    // ====================================================
    // FOOTER
    // ====================================================

    const updateText =
        is24h
            ? "Resets daily at midnight"
            : "Resets every Monday";

    container.addTextDisplayComponents(
        sections.text(
            `-# ${symbols.online} LIVE ${styles.text.bullet} ${updateText}\n` +
            `-# ${symbols.time} Updated ${timestamps.now()}\n` +
            `-# ${styles.brand.symbol} ${styles.brand.name} Activity System`
        )
    );

    return container;
}

module.exports = createActivityEmbed;