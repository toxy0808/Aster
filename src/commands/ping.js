const {
    MessageFlags,
    ContainerBuilder
} = require("discord.js");

const {
    symbols,
    timestamps
} = require("../utils/asterUI");

const EMOJI = {
    aster: "<a:pinkogniK:1537116042466164868>",
    ping: "<a:Arrow_setupxD:1537115995171459103>"
};

module.exports = {
    name: "ping",
    aliases: ["p"],

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
                .setAccentColor(0xFF4FA3)

                // =================================================
                // HEADER
                // =================================================

                .addTextDisplayComponents(
                    component =>
                        component.setContent(
                            `## ${EMOJI.aster} ASTER / SYSTEM`
                        )
                )

                .addSeparatorComponents()

                // =================================================
                // PING
                // =================================================

                .addTextDisplayComponents(
                    component =>
                        component.setContent(
                            `### ${EMOJI.ping} PONG\n` +
                            `**${ping}ms**`
                        )
                )

                .addSeparatorComponents()

                // =================================================
                // STATUS
                // =================================================

                .addTextDisplayComponents(
                    component =>
                        component.setContent(
                            `### 🟢 STATUS\n` +
                            `${status}`
                        )
                )

                .addSeparatorComponents()

                // =================================================
                // UPDATED
                // =================================================

                .addTextDisplayComponents(
                    component =>
                        component.setContent(
                            `${symbols.time} Updated ${timestamps.now()}`
                        )
                )

                // =================================================
                // FOOTER
                // =================================================

                .addTextDisplayComponents(
                    component =>
                        component.setContent(
                            `-# ${symbols.brand} ASTER • System Status`
                        )
                );

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container]
        });
    }
};