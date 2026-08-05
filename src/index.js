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

const messageCreate = require("./events/messageCreate");

client.on("messageCreate", (message) => {
    messageCreate(client, message);
});

const interactionCreate = require("./events/interactionCreate");

client.on("interactionCreate", (interaction) => {
    console.log("INTERACTION FIRED:", interaction.customId);
    interactionCreate(interaction);
});

client.once("ready", () => {
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


client.on("voiceStateUpdate", (oldState, newState) => {

    console.log("VOICE EVENT FIRED");

    require("./events/voiceStateUpdate")(oldState, newState);

});

client.login(process.env.TOKEN);

console.log(client.commands);