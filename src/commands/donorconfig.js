const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const db = require("../database/database");

module.exports = {
    name: "donorconfig",
    data: new SlashCommandBuilder()
        .setName("donorconfig")
        .setDescription("Manage donor system tiers (Admin Only)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((sub) =>
            sub
                .setName("settier")
                .setDescription("Add or update a donor tier")
                .addStringOption((opt) =>
                    opt.setName("tier_id").setDescription("Tier identifier (e.g., gold)").setRequired(true)
                )
                .addRoleOption((opt) =>
                    opt.setName("role").setDescription("Role to award").setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("Amount in USD").setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("removetier")
                .setDescription("Remove a donor tier")
                .addStringOption((opt) =>
                    opt.setName("tier_id").setDescription("Tier identifier").setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("list")
                .setDescription("List all donor tiers for this server")
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "⛔ You must have Administrator permissions to use this command.",
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (subcommand === "settier") {
            const tierId = interaction.options.getString("tier_id").toLowerCase();
            const role = interaction.options.getRole("role");
            const amount = interaction.options.getInteger("amount");

            db.donor.setTier(guildId, tierId, role.id, amount);

            const embed = new EmbedBuilder()
                .setTitle("⚙️ Donor Tier Updated")
                .setColor("#5865F2")
                .addFields(
                    { name: "Tier ID", value: tierId, inline: true },
                    { name: "Role", value: `<@&${role.id}>`, inline: true },
                    { name: "Price", value: `$${amount}`, inline: true }
                );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (subcommand === "removetier") {
            const tierId = interaction.options.getString("tier_id").toLowerCase();
            db.donor.removeTier(guildId, tierId);

            return interaction.reply({
                content: `✅ Tier \`${tierId}\` has been removed.`,
                ephemeral: true
            });
        }

        if (subcommand === "list") {
            const tiers = db.donor.listTiers(guildId);

            if (!tiers || !tiers.length) {
                return interaction.reply({
                    content: "No donor tiers configured yet.",
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle("📋 Donor Tiers Configured")
                .setColor("#5865F2")
                .setDescription(
                    tiers
                        .map((t) => `• **${t.tier_id}**: <@&${t.role_id}> - **$${t.amount}**`)
                        .join("\n")
                );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};