const { EmbedBuilder } = require("discord.js");

function shorten(name) {
    if (name.length > 14) {
        return name.slice(0, 12) + "...";
    }
}

function formatTime(minutes) {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;

    let result = "";

    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (mins > 0) result += `${mins}m`;

    return result.trim() || "0m";
}

function createActivityEmbed(chatUsers, voiceUsers, period, resetTimestamp = null) {

    const emojis = {
        logo: "<a:Weedleaf2:1459619037980921887>",

        activity: "<a:Fire8:1459590813410660564>",
        ruler: "<a:WeedLeaf:1459620147424788703>",
        crown: "<a:PinkCrown:1459619059707674809>",
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

    const chatText = chatUsers.length
        ? chatUsers.map((u, i) =>
            `${ranks[i]} **<@${u.user_id}>**\n` +
            `${emojis.activity} ${u.messages || 0} messages`
        ).join("\n")
        : "No data";

    const voiceText = voiceUsers.length
        ? voiceUsers.map((u, i) =>
            `${ranks[i]} **<@${u.user_id}>**\n` +
            `${emojis.ruler} ${formatTime(u.voice_time || 0)}`
        ).join("\n")
        : "No data";

    return new EmbedBuilder()
        .setColor("#FF4DA6")
        .setTitle(`${emojis.logo} ASTER Activity Rankings`)
        .setDescription(
            `${emojis.live} **LIVE • ${period.toUpperCase()}**\n` +
            `*Weekly rankings • Top 10 earn custom roles • #1 earns Chat/VC Ruler role*` +
            (
                (period === "7d" || period === "24h") && resetTimestamp
                    ? `\n\n⏳ **Resets:** <t:${resetTimestamp}:R>\n📅 **Reset:** <t:${resetTimestamp}:F>`
                    : ""
            )
        )
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
            text: "ASTER • Updates every 5 minutes\nWeekly Top 10 earn custom roles • #1 earns Chat/VC Ruler role"
        })
        .setTimestamp();
}

module.exports = createActivityEmbed;