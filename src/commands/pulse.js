const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

const { getPulseData } = require("../utils/asterPulse");
const { symbols, timestamps } = require("../utils/asterUI");

module.exports = {
    name: "pulse",

    data: new SlashCommandBuilder()
        .setName("pulse")
        .setDescription("View the live server activity pulse."),

    async execute(message) {

        const pulse = getPulseData(message.guild);

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4FA3);

        // ========================================================
        // HEADER
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${symbols.activity} ASTER / PULSE\n` +
                `-# Live server activity overview`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // STATUS
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.status} Current Pulse\n` +
                `**${pulse.state}**`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // CHAT
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.chat} Chat\n` +
                `**${Number(pulse.messagesPerMinute) || 0}** messages/min`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // VOICE
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.voice} Voice\n` +
                `**${Number(pulse.voiceUsers) || 0}** active`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // SCORE
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${symbols.level} Activity Score\n` +
                `**${Number(pulse.score) || 0}**`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        // ========================================================
        // FOOTER
        // ========================================================

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${symbols.time} Updated ${timestamps.now()}\n` +
                `-# ${symbols.brand} ASTER • Activity Tracking`
            )
        );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};