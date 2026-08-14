require("dotenv").config();
require("./database/database");
require("./database/activityLogs");
const { Client, GatewayIntentBits, Collection } = require("discord.js");

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

const db = require("./database/database");

client.commands = new Collection();
client.autoreacts = new Map();
client.autoresponders = require("./utils/autoresponder");

const rows = db.prepare(
    "SELECT user_id, emoji FROM autoreacts WHERE enabled = 1"
).all();

for (const row of rows) {
    client.autoreacts.set(row.user_id, row.emoji);
}

const messageCreate = require("./events/messageCreate");

client.on("messageCreate", (message) => {
    messageCreate(client, message);
});

const interactionCreate = require("./events/interactionCreate");

client.on("interactionCreate", (interaction) => {
    console.log("INTERACTION FIRED:", interaction.customId);
    interactionCreate(interaction);
});

client.once("clientReady", () => {
    console.log(`${client.user.tag} is online!`);

    require("./events/voiceStateUpdate");
    require("./events/voiceRecovery")(client);

    require("./events/leaderboardUpdater")(client);

    // ASTER Pulse
    require("./utils/asterPulse").startPulse(client);
});


client.commands.set("rank", require("./commands/rank"));
client.commands.set("activity", require("./commands/activity"));
client.commands.set("leaderboard", require("./commands/leaderboard"));
client.commands.set("activitylb", require("./commands/activityLeaderboard"));
client.commands.set("config", require("./commands/config"));
client.commands.set("autoreact",require("./commands/autoreact"));
client.commands.set("rep", require("./commands/rep"));
client.commands.set("help", require("./commands/help"));
client.commands.set("ping", require("./commands/ping"));
client.commands.set("repleaderboard", require("./commands/repleaderboard"));
client.commands.set("rephistory", require("./commands/rephistory"));
client.commands.set("pulse", require("./commands/pulse"));
client.commands.set("autoresponder", require("./commands/autoresponder"));



client.on("voiceStateUpdate", (oldState, newState) => {


    require("./events/voiceStateUpdate")(oldState, newState);

});

client.login(process.env.TOKEN);

console.log(client.commands);