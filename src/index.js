require("dotenv").config();
require("./database/database");
require("./database/activityLogs");

const {
    Client,
    GatewayIntentBits,
    Collection
} = require("discord.js");

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
// COMMANDS
// ========================================================

client.commands.set(
    "rank",
    require("./commands/rank")
);

client.commands.set(
    "activity",
    require("./commands/activity")
);

client.commands.set(
    "leaderboard",
    require("./commands/leaderboard")
);

client.commands.set(
    "activitylb",
    require("./commands/activityLeaderboard")
);

client.commands.set(
    "config",
    require("./commands/config")
);

client.commands.set(
    "autoreact",
    require("./commands/autoreact")
);

client.commands.set(
    "rep",
    require("./commands/rep")
);

client.commands.set(
    "represet",
    require("./commands/represet")
);

client.commands.set(
    "help",
    require("./commands/help")
);

client.commands.set(
    "ping",
    require("./commands/ping")
);

client.commands.set(
    "repleaderboard",
    require("./commands/repleaderboard")
);

client.commands.set(
    "rephistory",
    require("./commands/rephistory")
);

client.commands.set(
    "pulse",
    require("./commands/pulse")
);

client.commands.set(
    "autoresponder",
    require("./commands/autoresponder")
);

client.commands.set(
    "caption",
    require("./commands/caption")
);

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
// DEBUG
// ========================================================

console.log(
    client.commands
);

// ========================================================
// DASHBOARD
// ========================================================

require("../dashboard/server");