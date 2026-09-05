const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require("discord.js");

const {
    symbols,
    timestamps,
    styles
} = require("../utils/asterUI");

module.exports = {
    name: "help",
    aliases: ["commands", "cmds"],

    async execute(message) {
        const container = new ContainerBuilder()
            .setAccentColor(0xFF4FA3)

            // HEADER
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# ${symbols.brand} ASTER / HELP\n` +
                    `-# Commands, features & quick access`
                )
            )

            // ACTIVITY
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${symbols.activity} Activity\n` +
                    "`,activity` — View your activity stats.\n" +
                    "`,rank` — View your activity profile & rank.\n" +
                    "`,activitylb` — View the 24H & 7D leaderboards."
                )
            )

            // REPUTATION
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${symbols.reputation} Reputation\n` +
                    "`,rep` — View your reputation & server rank.\n" +
                    "`,rep @user` — Give **+1 REP**.\n" +
                    "`+rep @user` — Give **+1 REP**.\n" +
                    "`-rep @user` — Give **-1 REP**.\n" +
                    `-# ${symbols.info} REP can go below **0**. Daily limits and cooldowns apply.`
                )
            )

            // AUTOMATION
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${symbols.automation} Automation\n` +
                    "`,autoreact` — View Auto React usage.\n" +
                    "`,autoreact enable <:emoji>` — Set your reaction *(Boosters)*.\n" +
                    "`,autoreact disable` — Remove your reaction.\n" +
                    "`,autoreact list` — View configured reactions *(Admins)*."
                )
            )

            // CONFIGURATION
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${symbols.settings || symbols.automation} Configuration\n` +
                    "`,config` — Open the ASTER server configuration panel *(Admins)*."
                )
            )

            // QUICK START
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `### ${symbols.brand} Quick Start\n` +
                    "Check `,activity` for your stats, `,rep @user` to give REP, " +
                    "or `,activitylb` to see the current leaders."
                )
            )

            // FOOTER
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# ${symbols.time} ${timestamps.now()} ${styles.text.bullet} ` +
                    `${styles.brand.name} Community System`
                )
            );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: {
                parse: []
            }
        });
    }
};