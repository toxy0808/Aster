const { EmbedBuilder } = require("discord.js");

const { getPulseData } = require("../utils/asterPulse");

const EMOJI = {
    aster: "<a:pinkogniK:1537116042466164868>",
    pulse: "<a:Arrow_setupxD:1537115995171459103>",
    chat: "<a:795108partykillerpenguin:1537116231067377734>",
    voice: "<a:brownclock:1537116208435040388>",
    score: "<a:01x_diamond:1537116171185164388>"
};

module.exports = {
    name: "pulse",

    async execute(message) {

        const pulse = getPulseData(message.guild);

        const embed = new EmbedBuilder()
            .setColor(0xFF4FA3)
            .setAuthor({
                name: "ASTER  /  ACTIVITY",
                iconURL: message.client.user.displayAvatarURL({
                    extension: "png",
                    size: 128
                })
            })
            .setTitle(`${EMOJI.pulse}  ASTER PULSE`)
            .setDescription(
                `**${pulse.state}**\n` +
                `Live server activity overview`
            )
            .addFields(
                {
                    name: `${EMOJI.chat}  CHAT`,
                    value: `**${pulse.messagesPerMinute}** messages/min`,
                    inline: true
                },
                {
                    name: `${EMOJI.voice}  VOICE`,
                    value: `**${pulse.voiceUsers}** active`,
                    inline: true
                },
                {
                    name: `${EMOJI.score}  SCORE`,
                    value: `**${pulse.score}**`,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({
                text: "ASTER • Activity Tracking"
            });

        return message.reply({
            embeds: [embed]
        });
    }
};