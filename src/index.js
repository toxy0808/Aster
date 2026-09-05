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
            `ASTER: Loaded command: ${command.name}` +
            (
                command.data
                    ? ` → /${command.data.name}`
                    : " → legacy"
            )
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

client.on("messageCreate", async (message) => {

    try {

        await messageCreate(
            client,
            message
        );

    } catch (error) {

        console.error(
            "ASTER messageCreate error:",
            error
        );

    }

});

// ========================================================
// INTERACTION CREATE
// ========================================================

const interactionCreate =
    require("./events/interactionCreate");

client.on("interactionCreate", async (interaction) => {

    try {

        if (interaction.isChatInputCommand()) {

            console.log(
                `SLASH COMMAND: /${interaction.commandName}`
            );

        } else if (interaction.customId) {

            console.log(
                `INTERACTION: ${interaction.customId}`
            );

        }

        await interactionCreate(
            interaction
        );

    } catch (error) {

        console.error(
            "ASTER interactionCreate event error:",
            error
        );

        if (
            !interaction.replied &&
            !interaction.deferred
        ) {

            await interaction.reply({
                content:
                    "❌ ASTER encountered an unexpected error.",
                ephemeral: true
            }).catch(replyError => {

                console.error(
                    "ASTER failed to send interaction error:",
                    replyError
                );

            });

        }

    }

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

    try {

        await registerCommands(
            client
        );

        console.log(
            "ASTER: Slash commands registered."
        );

    } catch (error) {

        console.error(
            "ASTER: Failed to register slash commands:",
            error
        );

    }

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

        try {

            require("./events/voiceStateUpdate")(
                oldState,
                newState
            );

        } catch (error) {

            console.error(
                "ASTER voiceStateUpdate error:",
                error
            );

        }

    }
);

// ========================================================
// LOGIN
// ========================================================

client.login(
    process.env.TOKEN
).catch(error => {

    console.error(
        "ASTER login failed:",
        error
    );

});

// ========================================================
// DASHBOARD
// ========================================================

require("../dashboard/server");