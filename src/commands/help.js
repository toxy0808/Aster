const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

module.exports = {

    name: "help",
    aliases: ["commands", "cmds"],

    async execute(message) {

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4DA6)

            // =========================
            // HEADER
            // =========================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "# 🌸 ASTER • Help\n" +
                    "Everything you can do with ASTER, in one place."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // =========================
            // ACTIVITY
            // =========================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 🔥 Activity\n" +
                    "`,activity` — View your current activity stats.\n" +
                    "`,rank` — View your activity profile and rank.\n" +
                    "`,activitylb` — View the live 24H & 7D activity leaderboards."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // =========================
            // REPUTATION
            // =========================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### ✨ Reputation\n" +
                    "`,rep` — Check your current reputation.\n" +
                    "`,rep @user` — Give **+1 reputation** to a member.\n" +
                    "`+rep @user` — Give **+1 reputation** without the comma.\n" +
                    "`-rep @user` — Give **-1 reputation** without the comma.\n\n" +
                    "💡 Reputation can go below **0**. Positive and negative actions use one total reputation score."
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // =========================
            // OTHER
            // =========================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 🤖 Other\n" +
                    "`,autoreact` — Configure your automatic reaction.\n" +
                    "`,config` — Open the ASTER server configuration panel. *(Admins)*"
                )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
            )

            // =========================
            // FOOTER
            // =========================

            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "### 💡 Quick Start\n" +
                    "Use `,activity` to check your stats, `,rep @user` to give reputation, " +
                    "or `,activitylb` to see who's currently leading.\n\n" +
                    "🌸 **ASTER** • Built for communities"
                )
            );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};