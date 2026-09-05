const {
    REST,
    Routes
} = require("discord.js");

async function registerCommands(client) {
    const commands = [];

    for (const command of client.commands.values()) {
        if (!command.data) continue;

        commands.push(command.data.toJSON());
    }

    if (!commands.length) {
        console.log("ASTER: No slash commands to register.");
        return;
    }

    const rest = new REST({
        version: "10"
    }).setToken(process.env.TOKEN);

    try {
        console.log(
            `ASTER: Registering ${commands.length} slash commands...`
        );

        await rest.put(
            Routes.applicationCommands(client.user.id),
            {
                body: commands
            }
        );

        console.log(
            `ASTER: Registered ${commands.length} slash commands.`
        );
    } catch (error) {
        console.error(
            "ASTER: Failed to register slash commands:",
            error
        );
    }
}

module.exports = {
    registerCommands
};