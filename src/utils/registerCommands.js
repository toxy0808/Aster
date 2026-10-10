
const {
    REST,
    Routes
} = require("discord.js");

const disabledCommands = new Set([
    "activity",
    "rank",
    "leaderboard"
]);

async function registerCommands(client) {
    const commands = [];
    const legacy = [];

    for (const command of client.commands.values()) {
        const commandName = command.data?.name ?? command.name;

        // Do not register these slash commands.
        if (disabledCommands.has(commandName)) {
            console.log(
                `ASTER: Excluding disabled command: ${commandName}`
            );
            continue;
        }

        if (!command.data) {
            legacy.push(command.name);
            continue;
        }

        commands.push(command.data.toJSON());
    }

    console.log(
        `ASTER: ${commands.length} slash command(s) ready.`
    );

    if (legacy.length) {
        console.log(
            `ASTER: ${legacy.length} legacy command(s) waiting for migration: ${legacy.join(", ")}`
        );
    }

    const rest = new REST({
        version: "10"
    }).setToken(process.env.TOKEN);

    try {
        console.log("ASTER: Syncing global slash commands...");

        // Replaces the registered global command list.
        // Commands omitted from this array are removed from Discord.
        await rest.put(
            Routes.applicationCommands(client.user.id),
            {
                body: commands
            }
        );

        console.log(
            `ASTER: Successfully synced ${commands.length} global slash command(s).`
        );
    } catch (error) {
        console.error(
            "ASTER: Slash command registration failed:",
            error
        );
    }
}

module.exports = {
    registerCommands
};
