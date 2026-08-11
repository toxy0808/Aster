const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

const { getPulseData } = require("../utils/asterPulse");

module.exports = {
    name: "pulse",

    async execute(message) {

        const pulse = getPulseData(message.guild);

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "**ASTER**\n" +
                "PULSE"
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**${pulse.state}**`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**CHAT**  ${pulse.messagesPerMinute}/min\n` +
                `**VOICE**  ${pulse.voiceUsers}\n` +
                `**SCORE**  ${pulse.score}`
            )
        );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};