const {
    REST,
    Routes
} = require("discord.js");

async function registerCommands(client) {

    const commands = [];
    const legacy = [];

    for (const command of client.commands.values()) {

        if (!command.data) {
            legacy.push(command.name);
            continue;
        }

        commands.push(
            command.data.toJSON()
        );
    }

    console.log(
        `ASTER: ${commands.length} slash command(s) ready.`
    );

    if (legacy.length) {
        console.log(
            `ASTER: ${legacy.length} legacy command(s) waiting for migration: ${legacy.join(", ")}`
        );
    }

    if (!commands.length) {
        console.log(
            "ASTER: No slash commands to register."
        );
        return;
    }

    const rest = new REST({
        version: "10"
    }).setToken(
        process.env.TOKEN
    );

    try {

        console.log(
            "ASTER: Registering slash commands..."
        );

        await rest.put(
            Routes.applicationCommands(
                client.user.id
            ),
            {
                body: commands
            }
        );

        console.log(
            `ASTER: Registered ${commands.length} slash command(s).`
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