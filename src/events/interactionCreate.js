
const { ChannelType } = require("discord.js");
const {
ActionRowBuilder,
ChannelSelectMenuBuilder,
RoleSelectMenuBuilder,
ComponentType,
EmbedBuilder
} = require("discord.js");

const db = require("../database/database");

module.exports = async (interaction) => {
console.log(interaction.guild.channels.cache.map(c => c.name));
if (!interaction.isButton() && !interaction.isChannelSelectMenu() && !interaction.isRoleSelectMenu()) return;
console.log(
    "TYPE:",
    interaction.customId,
    "VALUES:",
    interaction.values
);
console.log("ANY INTERACTION:", interaction.type, interaction.customId);
// Leaderboard button
if (interaction.customId === "config_leaderboard") {

const menu = new ActionRowBuilder()
.addComponents(
new ChannelSelectMenuBuilder()
.setCustomId("set_leaderboard_channel")
.setPlaceholder("Select leaderboard channel")
);

return interaction.reply({
content: "🏆 Select the leaderboard channel:",
components: [menu],
ephemeral: true
});

}


// Roles button


// Save leaderboard channel
if (interaction.customId === "set_leaderboard_channel") {

const channelId = interaction.values[0];

db.prepare(`
UPDATE server_config
SET leaderboard_channel = ?
WHERE guild_id = ?
`).run(
channelId,
interaction.guild.id
);

return interaction.update({
content: `✅ Leaderboard channel set to <#${channelId}>`,
components: []
});

}


// Save roles
if (interaction.customId === "config_roles") {

const chatMenu = new ActionRowBuilder()
.addComponents(
    new RoleSelectMenuBuilder()
    .setCustomId("set_chat_role")
    .setPlaceholder("Select Chat King role")
    .setMinValues(1)
    .setMaxValues(1)
);

const voiceMenu = new ActionRowBuilder()
.addComponents(
    new RoleSelectMenuBuilder()
    .setCustomId("set_voice_role")
    .setPlaceholder("Select Voice King role")
    .setMinValues(1)
    .setMaxValues(1)
);

return interaction.reply({
    content: "👑 Select the activity roles:",
    components: [chatMenu, voiceMenu],
    flags: 64
});

}

if (interaction.customId === "set_chat_role") {

db.prepare(`
UPDATE server_config
SET chat_king_role = ?
WHERE guild_id = ?
`).run(
interaction.values[0],
interaction.guild.id
);

return interaction.update({
content: "✅ Chat King role saved!",
components: []
});

}

if (interaction.customId === "set_voice_role") {

db.prepare(`
UPDATE server_config
SET voice_king_role = ?
WHERE guild_id = ?
`).run(
interaction.values[0],
interaction.guild.id
);

return interaction.update({
content: "✅ Voice King role saved!",
components: []
});

}
};