const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const donorDb = require("../database/donor");
const donorUI = require("../utils/asterUI/donor");

function isAdmin(message) {
    return message.member?.permissions?.has(
        PermissionFlagsBits.Administrator
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("donorconfig")
        .setDescription("Configure the ASTER donor system")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator.toString()
        ),

    async execute(message) {
        if (!isAdmin(message)) {
            return message.reply({
                content:
                    "❌ **Administrator permission required.**\n" +
                    "Only server administrators can configure the donor system.",
                flags: MessageFlags.Ephemeral
            });
        }

        const settings = donorDb.getSettings(message.guild.id);
        const tiers = donorDb.listTiers(message.guild.id);

        return message.reply({
            components: donorUI.buildPanel(settings, tiers),
            flags: MessageFlags.IsComponentsV2
        });
    }
};