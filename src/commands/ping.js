const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require("discord.js");

const {
    symbols,
    timestamps,
    styles
} = require("../utils/asterUI");

const ACCENT =
    styles?.getTheme?.()?.colors?.accent ??
    0x7C5CFF;

const EMOJI = {
    aster: "<a:pinkogniK:1537116042466164868>",
    ping: "<a:Arrow_setupxD:1537115995171459103>"
};

module.exports = {
    name: "ping",

    aliases: ["p"],

    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check ASTER's system latency."),

    async execute(message) {

        const ping = message.client.ws.ping;

        const status =
            ping < 100
                ? "🟢 Excellent"
                : ping < 200
                    ? "🟡 Stable"
                    : "🔴 High";

        const container =
            new ContainerBuilder()
                .setAccentColor(ACCENT)

                // =================================================
                // HEADER
                // =================================================

                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ${EMOJI.aster} ASTER / SYSTEM\n` +
                        `-# Real-time gateway latency`
                    )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                // =================================================
                // PING
                // =================================================

                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### ${EMOJI.ping} PONG\n` +
                        `**${ping}ms**`
                    )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                // =================================================
                // STATUS
                // =================================================

                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### ${symbols.activity} STATUS\n` +
                        `${status}`
                    )
                )

                .addSeparatorComponents(
                    new SeparatorBuilder()
                )

                // =================================================
                // FOOTER
                // =================================================

                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# ${symbols.time} Updated ${timestamps.now()}\n` +
                        `-# ${symbols.brand} ASTER • System Status`
                    )
                );

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: {
                parse: []
            }
        });
    }
};