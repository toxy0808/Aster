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

client.commands = new Collection();
client.autoreacts = new Map();

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


client.on("voiceStateUpdate", (oldState, newState) => {


    require("./events/voiceStateUpdate")(oldState, newState);

});

client.login(process.env.TOKEN);

console.log(client.commands);