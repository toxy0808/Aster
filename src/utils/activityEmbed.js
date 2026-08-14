const { EmbedBuilder } = require("discord.js");

function formatTime(minutes) {
    minutes = Number(minutes) || 0;

    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;

    const parts = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);

    return parts.length ? parts.join(" ") : "0m";
}

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

    const safeChatUsers = Array.isArray(chatUsers)
        ? chatUsers
        : [];

    const safeVoiceUsers = Array.isArray(voiceUsers)
        ? voiceUsers
        : [];

    const chatText = safeChatUsers.length
        ? safeChatUsers
            .slice(0, 5)
            .map((user, index) =>
                `${ranks[index]} **<@${user.user_id}>**\n` +
                `${emojis.activity} ${Number(user.messages) || 0} messages`
            )
            .join("\n")
        : "No data";

    const voiceText = safeVoiceUsers.length
        ? safeVoiceUsers
            .slice(0, 5)
            .map((user, index) =>
                `${ranks[index]} **<@${user.user_id}>**\n` +
                `${emojis.ruler} ${formatTime(user.voice_time)}`
            )
            .join("\n")
        : "No data";

    const is24h = period === "24h";

    const description =
        `${emojis.live} **LIVE • ${period.toUpperCase()}**\n` +
        `*${is24h
            ? "Daily rankings • For competitive play"
            : "Weekly rankings • For competitive play"
        }*` +
        (
            resetTimestamp
                ? `\n\n⏳ **Resets:** <t:${resetTimestamp}:R>\n` +
                  `📅 **Reset:** <t:${resetTimestamp}:F>`
                : ""
        );

    const footer =
        is24h
            ? "ASTER • Updates every 5 minutes • Daily reset at midnight"
            : "ASTER • Updates every 5 minutes • Weekly reset every Monday";

    return new EmbedBuilder()
        .setColor("#FF4DA6")
        .setTitle(`${emojis.logo} ASTER Activity Rankings`)
        .setDescription(description)
        .addFields(
            {
                name: `${emojis.activity} CHAT KINGS`,
                value: chatText,
                inline: true
            },
            {
                name: "\u200b",
                value: "\u200b",
                inline: true
            },
            {
                name: `${emojis.ruler} VOICE KINGS`,
                value: voiceText,
                inline: true
            }
        )
        .setFooter({
            text: footer
        })
        .setTimestamp();
}

module.exports = createActivityEmbed;