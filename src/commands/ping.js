const { EmbedBuilder } = require("discord.js");

const EMOJI = {
    aster: "<a:pinkogniK:1537116042466164868>",
    ping: "<a:Arrow_setupxD:1537115995171459103>"
};

module.exports = {
    name: "ping",
    aliases: ["p"],

    async execute(message) {

        const ping = message.client.ws.ping;

        const embed = new EmbedBuilder()
            .setColor(0xFF4FA3)
            .setAuthor({
                name: "ASTER  /  SYSTEM",
                iconURL: message.client.user.displayAvatarURL({
                    extension: "png",
                    size: 128
                })
            })
            .setTitle(`${EMOJI.ping}  PONG`)
            .setDescription(
                `**${ping}ms**`
            )
            .addFields({
                name: `${EMOJI.aster}  STATUS`,
                value:
                    ping < 100
                        ? "🟢 Excellent"
                        : ping < 200
                            ? "🟡 Stable"
                            : "🔴 High",
                inline: true
            })
            .setTimestamp()
            .setFooter({
                text: "ASTER • System Status"
            });

        return message.reply({
            embeds: [embed]
        });
    }
};