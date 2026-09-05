require("dotenv").config();
require("./database/database");
require("./database/activityLogs");

const {
    Client,
    GatewayIntentBits,
    Collection
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const asterLogger = require("./utils/asterLogger");
const { registerCommands } = require("./utils/registerCommands");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// ========================================================
// ASTER LOGGER
// ========================================================

asterLogger.init(client);

// ========================================================
// DATABASE
// ========================================================

const db = require("./database/database");

// ========================================================
// COMMANDS / COLLECTIONS
// ========================================================

client.commands = new Collection();
client.autoreacts = new Map();
client.autoresponders = require("./utils/autoresponder");

// ========================================================
// COMMAND LOADER
// ========================================================

const commandsPath = path.join(
    __dirname,
    "commands"
);

const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {

    const filePath = path.join(
        commandsPath,
        file
    );

    try {

        const command = require(filePath);

        if (
            !command?.name ||
            typeof command.execute !== "function"
        ) {
            console.warn(
                `ASTER: Skipping invalid command: ${file}`
            );
            continue;
        }

        client.commands.set(
            command.name,
            command
        );

        console.log(
            `ASTER: Loaded command: ${command.name}`
        );

    } catch (error) {

        console.error(
            `ASTER: Failed to load command ${file}:`,
            error
        );

    }
}

// ========================================================
// AUTO REACTS
// ========================================================

const rows = db.prepare(
    "SELECT user_id, emoji FROM autoreacts WHERE enabled = 1"
).all();

for (const row of rows) {

    client.autoreacts.set(
        row.user_id,
        row.emoji
    );

}

// ========================================================
// MESSAGE CREATE
// ========================================================

const messageCreate =
    require("./events/messageCreate");

client.on("messageCreate", (message) => {
    messageCreate(client, message);
});

// ========================================================
// INTERACTION CREATE
// ========================================================

const interactionCreate =
    require("./events/interactionCreate");

client.on("interactionCreate", (interaction) => {

    if (interaction.isChatInputCommand()) {

        console.log(
            `SLASH COMMAND: /${interaction.commandName}`
        );

    } else if (interaction.customId) {

        console.log(
            `INTERACTION: ${interaction.customId}`
        );

    }

    interactionCreate(interaction);

});

// ========================================================
// READY
// ========================================================

client.once("clientReady", async () => {

    console.log(
        `${client.user.tag} is online!`
    );

    // ----------------------------------------------------
    // Slash Commands
    // ----------------------------------------------------

    await registerCommands(client);

    // ----------------------------------------------------
    // Voice
    // ----------------------------------------------------

    require("./events/voiceStateUpdate");

    require("./events/voiceRecovery")(
        client
    );

    // ----------------------------------------------------
    // Leaderboards
    // ----------------------------------------------------

    require("./events/leaderboardUpdater")(
        client
    );

    // ----------------------------------------------------
    // ASTER Pulse
    // ----------------------------------------------------

    require("./utils/asterPulse")
        .startPulse(client);

});

// ========================================================
// VOICE STATE UPDATE
// ========================================================

client.on(
    "voiceStateUpdate",
    (oldState, newState) => {

        require("./events/voiceStateUpdate")(
            oldState,
            newState
        );

    }
);

// ========================================================
// LOGIN
// ========================================================

client.login(
    process.env.TOKEN
);

// ========================================================
// DASHBOARD
// ========================================================

require("../dashboard/server");