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

// ========================================================
// DISCORD CLIENT
// TEMPORARY REDUCED-INTENT MODE
// ========================================================
//
// Only Guilds is enabled for now.
//
// This allows Aster to:
// - Connect to Discord
// - Appear online
// - Register slash commands
// - Receive slash-command interactions
// - Receive button/select/modal interactions
//
// Temporarily unavailable until privileged intents are restored:
// - Message-based features
// - Voice-state features
//
// ========================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
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

let commandFiles = [];

try {
    commandFiles = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith(".js"));
} catch (error) {
    console.error(
        "ASTER: Failed to read commands directory:",
        error
    );
}

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
//
// Database loading is kept because it is safe to initialize.
// Message events themselves are unavailable while reduced
// intents are active.
//

try {

    const rows = db.prepare(
        "SELECT user_id, emoji FROM autoreacts WHERE enabled = 1"
    ).all();

    for (const row of rows) {

        client.autoreacts.set(
            row.user_id,
            row.emoji
        );

    }

    console.log(
        `ASTER: Loaded ${client.autoreacts.size} autoreact configuration(s).`
    );

} catch (error) {

    console.error(
        "ASTER: Failed to load autoreacts:",
        error
    );

}

// ========================================================
// MESSAGE CREATE
// TEMPORARILY DISABLED
// ========================================================
//
// GuildMessages / MessageContent are not enabled.
//
// Do NOT register messageCreate until the required
// Discord intents have been approved.
//

// const messageCreate = require("./events/messageCreate");

// client.on("messageCreate", async (message) => {

//     try {

//         await messageCreate(
//             client,
//             message
//         );

//     } catch (error) {

//         console.error(
//             "ASTER messageCreate error:",
//             error
//         );

//     }

// });

// ========================================================
// INTERACTION CREATE
// ========================================================
//
// This remains enabled because slash commands and other
// interactions are the main functionality we want online.
//

const interactionCreate =
    require("./events/interactionCreate");

client.on(
    "interactionCreate",
    async (interaction) => {

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

    }
);

// ========================================================
// READY
// ========================================================

client.once(
    "ready",
    async () => {

        console.log(
            "================================================"
        );

        console.log(
            `ASTER: ${client.user.tag} is online!`
        );

        console.log(
            "ASTER: Temporary reduced-intent mode enabled."
        );

        console.log(
            "ASTER: Gateway intents: Guilds only."
        );

        console.log(
            "================================================"
        );

        // ------------------------------------------------
        // SLASH COMMANDS
        // ------------------------------------------------

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

        // ------------------------------------------------
        // VOICE
        // TEMPORARILY DISABLED
        // ------------------------------------------------

        console.log(
            "ASTER: Voice features temporarily disabled."
        );

        // ------------------------------------------------
        // LEADERBOARDS
        // TEMPORARILY DISABLED
        // ------------------------------------------------

        console.log(
            "ASTER: Voice/leaderboard background systems temporarily disabled."
        );

    }
);

// ========================================================
// VOICE STATE UPDATE
// TEMPORARILY DISABLED
// ========================================================
//
// GuildVoiceStates is intentionally not requested yet.
//

// client.on(
//     "voiceStateUpdate",
//     (oldState, newState) => {

//         try {

//             require("./events/voiceStateUpdate")(
//                 oldState,
//                 newState
//             );

//         } catch (error) {

//             console.error(
//                 "ASTER voiceStateUpdate error:",
//                 error
//             );

//         }

//     }
// );

// ========================================================
// LOGIN
// ========================================================

if (!process.env.TOKEN) {

    console.error(
        "ASTER: TOKEN is missing from environment variables."
    );

    process.exit(1);

}

client.login(
    process.env.TOKEN
).catch(error => {

    console.error(
        "ASTER login failed:",
        error
    );

});