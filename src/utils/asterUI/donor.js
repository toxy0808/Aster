const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require("discord.js");

const symbols = require("./symbols");

const ACCENT = 0xFF4DA6;

function text(content) {
    return new TextDisplayBuilder()
        .setContent(String(content ?? ""));
}

function separator() {
    return new SeparatorBuilder();
}

function container() {
    return new ContainerBuilder()
        .setAccentColor(ACCENT);
}

function enabled(value) {
    return value
        ? "◉ Enabled"
        : "○ Disabled";
}

function channel(id) {
    return id
        ? `<#${id}>`
        : "`Not configured`";
}

function role(id) {
    return id
        ? `<@&${id}>`
        : "`Not configured`";
}

function kofi(url) {
    return url
        ? `[Open Ko-fi](<${url}>)`
        : "`Not configured`";
}

/* ============================================================
   MAIN DONOR CONFIG
   ============================================================ */

function buildPanel(settings, tiers = []) {

    const activeTiers =
        tiers.filter(tier => Number(tier.enabled) === 1);

    const tierText =
        activeTiers.length
            ? activeTiers
                .map(tier =>
                    `◆ **${tier.tier_id}** — **$${Number(tier.amount).toFixed(0)}** → ${role(tier.role_id)}`
                )
                .join("\n")
            : "`No donor tiers configured.`";

    const message =
        settings.announcement_message ||
        "Thank you {user} for supporting {guild}! 💜";

    const main =
        container()

            .addTextDisplayComponents(
                text(
                    `# ${symbols.brand} ASTER / DONOR SYSTEM\n` +
                    `-# Donation management, announcements, logging and donor rewards.\n\n` +

                    `### ◇ System\n` +
                    `**Status:** ${enabled(settings.enabled)}\n` +
                    `**Ko-fi:** ${kofi(settings.kofi_url)}\n\n` +

                    `### ⌘ Announcements\n` +
                    `**Status:** ${enabled(settings.announcements_enabled)}\n` +
                    `**Channel:** ${channel(settings.announcement_channel_id)}\n\n` +

                    `### ◈ Logging\n` +
                    `**Status:** ${enabled(settings.logging_enabled)}\n` +
                    `**Channel:** ${channel(settings.log_channel_id)}`
                )
            )

            .addSeparatorComponents(separator())

            .addTextDisplayComponents(
                text(
                    `### ♛ Donor Tiers\n\n` +
                    tierText
                )
            )

            .addSeparatorComponents(separator())

            .addTextDisplayComponents(
                text(
                    `### ✦ Announcement Message\n` +
                    `\`\`\`\n${message}\n\`\`\`\n` +
                    `-# Use **Variables & Guide** to see every supported variable.`
                )
            )

            .addSeparatorComponents(separator())

            .addTextDisplayComponents(
                text(
                    `### ⌘ Admin Setup\n\n` +
                    `**1.** Add your Ko-fi URL.\n` +
                    `**2.** Select an announcement channel.\n` +
                    `**3.** Select a logging channel if desired.\n` +
                    `**4.** Enable the required systems.\n` +
                    `**5.** Add donor tiers and Discord roles.\n` +
                    `**6.** Test the announcement before going live.\n\n` +
                    `-# Administrator permissions are required to change donor settings.`
                )
            );

    const row1 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("donor_toggle")
                    .setLabel(
                        settings.enabled
                            ? "Disable System"
                            : "Enable System"
                    )
                    .setStyle(
                        settings.enabled
                            ? ButtonStyle.Danger
                            : ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId("donor_kofi")
                    .setLabel("Ko-fi URL")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("donor_announcement_channel")
                    .setLabel("Announcement Channel")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("donor_log_channel")
                    .setLabel("Log Channel")
                    .setStyle(ButtonStyle.Secondary)
            );

    const row2 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("donor_toggle_announcements")
                    .setLabel(
                        settings.announcements_enabled
                            ? "Disable Announcements"
                            : "Enable Announcements"
                    )
                    .setStyle(
                        settings.announcements_enabled
                            ? ButtonStyle.Danger
                            : ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId("donor_toggle_logging")
                    .setLabel(
                        settings.logging_enabled
                            ? "Disable Logging"
                            : "Enable Logging"
                    )
                    .setStyle(
                        settings.logging_enabled
                            ? ButtonStyle.Danger
                            : ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId("donor_announcement_message")
                    .setLabel("Announcement Message")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("donor_variables")
                    .setLabel("Variables & Guide")
                    .setStyle(ButtonStyle.Primary)
            );

    const row3 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("donor_test")
                    .setLabel("Test Announcement")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("donor_add_tier")
                    .setLabel("Add Tier")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("donor_manage_tiers")
                    .setLabel("Manage Tiers")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("donor_view_config")
                    .setLabel("View Config")
                    .setStyle(ButtonStyle.Secondary)
            );

    const row4 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("donor_reset")
                    .setLabel("Reset")
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId("donor_refresh")
                    .setLabel("Refresh")
                    .setStyle(ButtonStyle.Secondary)
            );

    return [
        main,
        row1,
        row2,
        row3,
        row4
    ];
}

/* ============================================================
   VARIABLES / GUIDE
   ============================================================ */

function buildVariables() {

    return [

        container()

            .addTextDisplayComponents(
                text(
                    `# ${symbols.brand} ASTER / DONOR GUIDE\n` +
                    `-# Customize donor announcements with dynamic variables.`
                )
            )

            .addSeparatorComponents(separator())

            .addTextDisplayComponents(
                text(
                    `### ◇ User Variables\n\n` +

                    `**{user}**\n` +
                    `Mentions the donor.\n\n` +

                    `**{username}**\n` +
                    `Shows the donor's username.\n\n` +

                    `**{member}**\n` +
                    `Mentions the Discord member.`
                )
            )

            .addSeparatorComponents(separator())

            .addTextDisplayComponents(
                text(
                    `### ◈ Server Variables\n\n` +

                    `**{guild}**\n` +
                    `Shows the server name.\n\n` +

                    `**{channel}**\n` +
                    `Mentions the announcement channel.\n\n` +

                    `**{link}**\n` +
                    `Inserts your configured Ko-fi URL.`
                )
            )

            .addSeparatorComponents(separator())

            .addTextDisplayComponents(
                text(
                    `### ♛ Donation Variables\n\n` +

                    `**{role}**\n` +
                    `Mentions the donor tier role.\n\n` +

                    `**{tier}**\n` +
                    `Shows the donor tier name.\n\n` +

                    `**{amount}**\n` +
                    `Shows the donation amount.\n\n` +

                    `**{currency}**\n` +
                    `Shows the donation currency.`
                )
            )

            .addSeparatorComponents(separator())

            .addTextDisplayComponents(
                text(
                    `### ✦ Example\n\n` +
                    `\`Thank you {user} for supporting {guild}! 💜\`\n\n` +
                    `\`You unlocked {tier}: {role}\`\n\n` +
                    `\`Donation: {amount} {currency}\`\n\n` +
                    `\`Support ASTER: {link}\`\n\n` +
                    `-# Variables are replaced automatically when ASTER processes the donation.`
                )
            )

            .addSeparatorComponents(separator())

            .addTextDisplayComponents(
                text(
                    `### ⌘ Admin Checklist\n\n` +
                    `◈ Configure Ko-fi URL\n` +
                    `◈ Select announcement channel\n` +
                    `◈ Select logging channel\n` +
                    `◈ Add donor tiers\n` +
                    `◈ Assign donor roles\n` +
                    `◈ Customize announcement message\n` +
                    `◈ Run a test announcement\n\n` +
                    `-# Keep donor roles configured before enabling the system.`
                )
            ),

        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("donor_refresh")
                    .setLabel("Back to Donor Config")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

/* ============================================================
   CONFIG VIEW
   ============================================================ */

function buildConfigView(settings, tiers = []) {

    const tierText =
        tiers.length
            ? tiers
                .map(tier =>
                    `◆ **${tier.tier_id}** — $${Number(tier.amount).toFixed(0)} — ${role(tier.role_id)} — ${enabled(tier.enabled)}`
                )
                .join("\n")
            : "`No tiers configured.`";

    return [

        container()

            .addTextDisplayComponents(
                text(
                    `# ${symbols.brand} ASTER / DONOR CONFIG\n` +
                    `-# Current configuration snapshot.`
                )
            )

            .addSeparatorComponents(separator())

            .addTextDisplayComponents(
                text(
                    `### ◇ General\n` +
                    `**System:** ${enabled(settings.enabled)}\n` +
                    `**Ko-fi:** ${kofi(settings.kofi_url)}`
                )
            )

            .addSeparatorComponents(separator())

            .addTextDisplayComponents(
                text(
                    `### ⌘ Announcements\n` +
                    `**Enabled:** ${enabled(settings.announcements_enabled)}\n` +
                    `**Channel:** ${channel(settings.announcement_channel_id)}\n` +
                    `**Message:** ${settings.announcement_message || "`Default`"}`
                )
            )

            .addSeparatorComponents(separator())

            .addTextDisplayComponents(
                text(
                    `### ◈ Logging\n` +
                    `**Enabled:** ${enabled(settings.logging_enabled)}\n` +
                    `**Channel:** ${channel(settings.log_channel_id)}`
                )
            )

            .addSeparatorComponents(separator())

            .addTextDisplayComponents(
                text(
                    `### ♛ Donor Tiers\n\n${tierText}`
                )
            ),

        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("donor_refresh")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

/* ============================================================
   CHANNEL PICKER
   ============================================================ */

function buildChannelPicker(type, currentId) {

    const announcement =
        type === "announcement";

    return [

        container()

            .addTextDisplayComponents(
                text(
                    `# ${symbols.brand} ASTER / ${
                        announcement
                            ? "ANNOUNCEMENT CHANNEL"
                            : "LOGGING CHANNEL"
                    }\n` +

                    `-# Select the channel ASTER should use.\n\n` +

                    `### ◇ Current\n` +
                    `${channel(currentId)}\n\n` +

                    `-# Select a channel below.`
                )
            ),

        new ActionRowBuilder()
            .addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId(
                        announcement
                            ? "donor_select_announcement_channel"
                            : "donor_select_log_channel"
                    )
                    .setPlaceholder(
                        currentId
                            ? "Change channel"
                            : "Select channel"
                    )
                    .setMinValues(1)
                    .setMaxValues(1)
            ),

        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("donor_refresh")
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

/* ============================================================
   TIER ROLE PICKER
   ============================================================ */

function buildTierRolePicker(tierId, amount) {

    return [

        container()

            .addTextDisplayComponents(
                text(
                    `# ${symbols.brand} ASTER / DONOR ROLE\n` +
                    `-# Connect a Discord role to this donor tier.\n\n` +

                    `### ◇ Tier\n` +
                    `**${tierId}**\n\n` +

                    `### ◈ Amount\n` +
                    `**$${Number(amount).toFixed(0)}**\n\n` +

                    `-# Select the Discord role that belongs to this tier.`
                )
            ),

        new ActionRowBuilder()
            .addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId(
                        `donor_tier_role_${tierId}_${amount}`
                    )
                    .setPlaceholder("Select donor role")
                    .setMinValues(1)
                    .setMaxValues(1)
            )
    ];
}

/* ============================================================
   TIER MANAGEMENT
   ============================================================ */

function buildTierManager(tiers = []) {

    if (!tiers.length) {

        return [

            container()
                .addTextDisplayComponents(
                    text(
                        `# ${symbols.brand} ASTER / DONOR TIERS\n` +
                        `-# No donor tiers have been configured yet.\n\n` +

                        `### ✦ Getting Started\n` +
                        `Use **Add Tier** from the main donor configuration to create your first tier.`
                    )
                ),

            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("donor_add_tier")
                        .setLabel("Add Tier")
                        .setStyle(ButtonStyle.Primary),

                    new ButtonBuilder()
                        .setCustomId("donor_refresh")
                        .setLabel("Back")
                        .setStyle(ButtonStyle.Secondary)
                )
        ];
    }

    const options =
        tiers
            .slice(0, 25)
            .map(tier =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(
                        `${tier.tier_id} — $${Number(tier.amount).toFixed(0)}`
                    )
                    .setDescription(
                        tier.role_id
                            ? "Role configured"
                            : "Role not configured"
                    )
                    .setValue(
                        String(tier.tier_id)
                    )
            );

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId("donor_select_tier")
            .setPlaceholder("Select a donor tier")
            .addOptions(options);

    return [

        container()
            .addTextDisplayComponents(
                text(
                    `# ${symbols.brand} ASTER / DONOR TIERS\n` +
                    `-# Manage your donation tiers and Discord rewards.\n\n` +

                    `### ◇ Available Tiers\n` +
                    `Select a tier below to manage it.`
                )
            ),

        new ActionRowBuilder()
            .addComponents(menu),

        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("donor_add_tier")
                    .setLabel("Add Tier")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("donor_refresh")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

function buildSelectedTier(tier) {

    return [

        container()
            .addTextDisplayComponents(
                text(
                    `# ${symbols.brand} ASTER / TIER\n` +
                    `-# Manage this donor reward tier.\n\n` +

                    `### ◇ Tier\n` +
                    `**${tier.tier_id}**\n\n` +

                    `### ◈ Donation Amount\n` +
                    `**$${Number(tier.amount).toFixed(0)}**\n\n` +

                    `### ♛ Discord Role\n` +
                    `${role(tier.role_id)}\n\n` +

                    `### ⌘ Status\n` +
                    `${enabled(tier.enabled)}`
                )
            ),

        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        `donor_tier_role_${tier.tier_id}`
                    )
                    .setLabel("Change Role")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId(
                        `donor_tier_toggle_${tier.tier_id}`
                    )
                    .setLabel(
                        tier.enabled
                            ? "Disable"
                            : "Enable"
                    )
                    .setStyle(
                        tier.enabled
                            ? ButtonStyle.Secondary
                            : ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `donor_tier_delete_${tier.tier_id}`
                    )
                    .setLabel("Delete")
                    .setStyle(ButtonStyle.Danger)
            ),

        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("donor_manage_tiers")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
            )
    ];
}

module.exports = {
    buildPanel,
    buildVariables,
    buildConfigView,
    buildChannelPicker,
    buildTierRolePicker,
    buildTierManager,
    buildSelectedTier
};