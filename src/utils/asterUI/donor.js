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
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder
} = require("discord.js");

const symbols = require("./symbols");
const styles = require("./styles");

const ACCENT =
    styles?.getTheme?.().colors?.accent ??
    0x7C5CFF;

/* ============================================================
   ASTER UI HELPERS
   ============================================================ */

function text(content) {
    return new TextDisplayBuilder()
        .setContent(String(content ?? ""));
}

function separator() {
    return new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(
            SeparatorSpacingSize.Small
        );
}

function container() {
    return new ContainerBuilder()
        .setAccentColor(ACCENT);
}

function enabled(value) {
    return Number(value) === 1
        ? "● Enabled"
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

function button(
    customId,
    label,
    style = ButtonStyle.Secondary
) {
    return new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(style);
}

function backButton(customId = "donor_refresh") {
    return button(
        customId,
        "Back",
        ButtonStyle.Secondary
    );
}

function panelHeader(
    title,
    description
) {
    return text(
        `# ${symbols.brand || "✦"} ${title}\n` +
        `-# ${description}`
    );
}

function statusLine(
    label,
    value
) {
    return `**${label}**  ${value}`;
}

function safeAmount(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "0";
    }

    return amount.toFixed(0);
}

function isEnabled(value) {
    return Number(value) === 1;
}

/* ============================================================
   MAIN DONOR CONFIG
   ============================================================ */

function buildPanel(
    settings = {},
    tiers = []
) {
    const activeTiers =
        tiers.filter(
            tier =>
                Number(tier.enabled) === 1
        );

    const message =
        settings.announcement_message ||
        "Thank you {user} for supporting {guild}! 💜";

    const main =
        container();

    /* --------------------------------------------------------
       Header
    -------------------------------------------------------- */

    main.addTextDisplayComponents(
        panelHeader(
            "ASTER / DONOR",
            "Donation management, announcements, logging and rewards."
        )
    );

    main.addSeparatorComponents(
        separator()
    );

    /* --------------------------------------------------------
       System overview
    -------------------------------------------------------- */

    main.addTextDisplayComponents(
        text(
            `### ◇ System\n` +
            `${statusLine(
                "Status",
                enabled(settings.enabled)
            )}\n` +
            `${statusLine(
                "Ko-fi",
                kofi(settings.kofi_url)
            )}\n\n` +

            `### ⌘ Announcements\n` +
            `${statusLine(
                "Status",
                enabled(
                    settings.announcements_enabled
                )
            )}\n` +
            `${statusLine(
                "Channel",
                channel(
                    settings.announcement_channel_id
                )
            )}\n\n` +

            `### ◈ Logging\n` +
            `${statusLine(
                "Status",
                enabled(
                    settings.logging_enabled
                )
            )}\n` +
            `${statusLine(
                "Channel",
                channel(
                    settings.log_channel_id
                )
            )}`
        )
    );

    main.addSeparatorComponents(
        separator()
    );

    /* --------------------------------------------------------
       Quick controls
    -------------------------------------------------------- */

    main.addTextDisplayComponents(
        text("### ✦ Quick Controls")
    );

    main.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_toggle",
                    settings.enabled
                        ? "Disable System"
                        : "Enable System",
                    settings.enabled
                        ? ButtonStyle.Danger
                        : ButtonStyle.Success
                ),

                button(
                    "donor_toggle_announcements",
                    settings.announcements_enabled
                        ? "Disable Announcements"
                        : "Enable Announcements",
                    settings.announcements_enabled
                        ? ButtonStyle.Danger
                        : ButtonStyle.Success
                ),

                button(
                    "donor_toggle_logging",
                    settings.logging_enabled
                        ? "Disable Logging"
                        : "Enable Logging",
                    settings.logging_enabled
                        ? ButtonStyle.Danger
                        : ButtonStyle.Success
                )
            )
    );

    main.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_kofi",
                    "Ko-fi URL",
                    ButtonStyle.Secondary
                ),

                button(
                    "donor_announcement_channel",
                    "Announcement Channel",
                    ButtonStyle.Secondary
                ),

                button(
                    "donor_log_channel",
                    "Log Channel",
                    ButtonStyle.Secondary
                )
            )
    );

    main.addSeparatorComponents(
        separator()
    );

    /* --------------------------------------------------------
       Donor tiers
    -------------------------------------------------------- */

    main.addTextDisplayComponents(
        text(
            `### ♛ Donor Tiers\n` +
            `-# ${activeTiers.length} active ${
                activeTiers.length === 1
                    ? "tier"
                    : "tiers"
            }`
        )
    );

    if (activeTiers.length) {
        for (
            const tier of activeTiers.slice(0, 10)
        ) {
            main.addTextDisplayComponents(
                text(
                    `**◆ ${tier.tier_id}**  •  ` +
                    `**${safeAmount(tier.amount)} ${
                        tier.currency || "USD"
                    }**\n` +
                    `${role(tier.role_id)}`
                )
            );
        }

        if (activeTiers.length > 10) {
            main.addTextDisplayComponents(
                text(
                    `-# + ${
                        activeTiers.length - 10
                    } more tiers`
                )
            );
        }
    } else {
        main.addTextDisplayComponents(
            text(
                "`No active donor tiers configured.`"
            )
        );
    }

    main.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_add_tier",
                    "Add Tier",
                    ButtonStyle.Primary
                ),

                button(
                    "donor_manage_tiers",
                    "Manage Tiers",
                    ButtonStyle.Secondary
                )
            )
    );

    main.addSeparatorComponents(
        separator()
    );

    /* --------------------------------------------------------
       Announcement preview
    -------------------------------------------------------- */

    main.addTextDisplayComponents(
        text(
            `### ✦ Announcement Preview\n` +
            `\`\`\`\n` +
            `${String(message).slice(0, 900)}\n` +
            `\`\`\`\n` +
            `-# Variables are replaced automatically when a donation is processed.`
        )
    );

    main.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_announcement_message",
                    "Edit Message",
                    ButtonStyle.Secondary
                ),

                button(
                    "donor_variables",
                    "Variables",
                    ButtonStyle.Secondary
                ),

                button(
                    "donor_test",
                    "Test Announcement",
                    ButtonStyle.Success
                )
            )
    );

    main.addSeparatorComponents(
        separator()
    );

    /* --------------------------------------------------------
       Utility controls
    -------------------------------------------------------- */

    main.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_view_config",
                    "View Configuration",
                    ButtonStyle.Secondary
                ),

                button(
                    "donor_refresh",
                    "Refresh",
                    ButtonStyle.Secondary
                ),

                button(
                    "donor_reset",
                    "Reset",
                    ButtonStyle.Danger
                )
            )
    );

    main.addTextDisplayComponents(
        text(
            "-# ASTER Donor System • Administrator configuration"
        )
    );

    return [main];
}

/* ============================================================
   VARIABLES / GUIDE
   ============================================================ */

function buildVariables() {
    const panel =
        container();

    panel.addTextDisplayComponents(
        panelHeader(
            "ASTER / DONOR GUIDE",
            "Use dynamic variables to personalize donor announcements."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ◇ User\n\n` +
            `**{user}**\n` +
            `Mentions the donor.\n\n` +

            `**{username}**\n` +
            `Shows the donor's username.\n\n` +

            `**{member}**\n` +
            `Mentions the Discord member.`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ◈ Server\n\n` +
            `**{guild}**\n` +
            `Shows the server name.\n\n` +

            `**{channel}**\n` +
            `Mentions the configured announcement channel.\n\n` +

            `**{link}**\n` +
            `Inserts the configured Ko-fi URL.`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ♛ Donation\n\n` +
            `**{role}**\n` +
            `Mentions the donor tier role.\n\n` +

            `**{tier}**\n` +
            `Shows the donor tier.\n\n` +

            `**{amount}**\n` +
            `Shows the donation amount.\n\n` +

            `**{currency}**\n` +
            `Shows the donation currency.`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ✦ Example\n\n` +
            `> Thank you {user} for supporting {guild}! 💜\n` +
            `> You unlocked {tier} — {amount} {currency}.\n\n` +
            `-# Variables are replaced automatically when ASTER processes a donation.`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ⌘ Recommended Setup\n\n` +
            `◆ Configure your Ko-fi URL\n` +
            `◆ Select an announcement channel\n` +
            `◆ Configure logging\n` +
            `◆ Add donor tiers\n` +
            `◆ Assign donor roles\n` +
            `◆ Customize the announcement\n` +
            `◆ Run a test before enabling the system`
        )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                backButton()
            )
    );

    return [panel];
}

/* ============================================================
   CONFIGURATION VIEW
   ============================================================ */

function buildConfigView(
    settings = {},
    tiers = []
) {
    const panel =
        container();

    panel.addTextDisplayComponents(
        panelHeader(
            "ASTER / DONOR CONFIG",
            "Current configuration snapshot."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ◇ General\n` +
            `${statusLine(
                "System",
                enabled(settings.enabled)
            )}\n` +
            `${statusLine(
                "Ko-fi",
                kofi(settings.kofi_url)
            )}`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ⌘ Announcements\n` +
            `${statusLine(
                "Enabled",
                enabled(
                    settings.announcements_enabled
                )
            )}\n` +
            `${statusLine(
                "Channel",
                channel(
                    settings.announcement_channel_id
                )
            )}\n` +
            `${statusLine(
                "Message",
                settings.announcement_message
                    ? "Configured"
                    : "Default"
            )}`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ◈ Logging\n` +
            `${statusLine(
                "Enabled",
                enabled(
                    settings.logging_enabled
                )
            )}\n` +
            `${statusLine(
                "Channel",
                channel(
                    settings.log_channel_id
                )
            )}`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    const tierLines =
        tiers.length
            ? tiers
                .slice(0, 15)
                .map(
                    tier =>
                        `**◆ ${tier.tier_id}** — ` +
                        `${safeAmount(tier.amount)} ${
                            tier.currency || "USD"
                        } — ` +
                        `${role(tier.role_id)} — ` +
                        `${enabled(tier.enabled)}`
                )
                .join("\n")
            : "`No tiers configured.`";

    panel.addTextDisplayComponents(
        text(
            `### ♛ Donor Tiers\n${tierLines}`
        )
    );

    if (tiers.length > 15) {
        panel.addTextDisplayComponents(
            text(
                `-# + ${
                    tiers.length - 15
                } additional tiers`
            )
        );
    }

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                backButton()
            )
    );

    return [panel];
}

/* ============================================================
   CHANNEL PICKER
   ============================================================ */

function buildChannelPicker(
    type,
    currentId
) {
    const announcement =
        type === "announcement";

    const title =
        announcement
            ? "ANNOUNCEMENT CHANNEL"
            : "LOGGING CHANNEL";

    const customId =
        announcement
            ? "donor_select_announcement_channel"
            : "donor_select_log_channel";

    const panel =
        container();

    panel.addTextDisplayComponents(
        panelHeader(
            `ASTER / ${title}`,
            "Select the Discord channel ASTER should use."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ◇ Current Channel\n` +
            `${channel(currentId)}\n\n` +
            `-# Choose a new channel below.`
        )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder(
                        currentId
                            ? "Change channel"
                            : "Select channel"
                    )
                    .setMinValues(1)
                    .setMaxValues(1)
            )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                backButton()
            )
    );

    return [panel];
}

/* ============================================================
   DONOR TIER ROLE PICKER
   ============================================================ */

function buildTierRolePicker(
    tierId,
    amount
) {
    const panel =
        container();

    panel.addTextDisplayComponents(
        panelHeader(
            "ASTER / DONOR ROLE",
            "Connect a Discord role to this donor tier."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ◇ Tier\n` +
            `**${tierId}**\n\n` +

            `### ◈ Donation Amount\n` +
            `**${safeAmount(amount)}**\n\n` +

            `-# Select the Discord role that belongs to this tier.`
        )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId(
                        `donor_tier_role_${tierId}_${amount}`
                    )
                    .setPlaceholder(
                        "Select donor role"
                    )
                    .setMinValues(1)
                    .setMaxValues(1)
            )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_manage_tiers",
                    "Back",
                    ButtonStyle.Secondary
                )
            )
    );

    return [panel];
}

/* ============================================================
   TIER MANAGEMENT
   ============================================================ */

function buildTierManager(
    tiers = []
) {
    const panel =
        container();

    panel.addTextDisplayComponents(
        panelHeader(
            "ASTER / DONOR TIERS",
            "Manage donation tiers and their Discord rewards."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    if (!tiers.length) {
        panel.addTextDisplayComponents(
            text(
                `### ✦ No Tiers Yet\n` +
                `No donor tiers have been configured.\n\n` +
                `Use **Add Tier** to create your first donor reward.`
            )
        );

        panel.addActionRowComponents(
            row =>
                row.addComponents(
                    button(
                        "donor_add_tier",
                        "Add Tier",
                        ButtonStyle.Primary
                    ),

                    backButton()
                )
        );

        return [panel];
    }

    panel.addTextDisplayComponents(
        text(
            `### ◇ Available Tiers\n` +
            `Select a tier below to manage it.`
        )
    );

    const options =
        tiers
            .slice(0, 25)
            .map(tier =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(
                        `${tier.tier_id} — ${safeAmount(
                            tier.amount
                        )} ${
                            tier.currency || "USD"
                        }`
                    )
                    .setDescription(
                        tier.role_id
                            ? "Discord role configured"
                            : "Discord role not configured"
                    )
                    .setValue(
                        String(tier.tier_id)
                    )
            );

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                "donor_select_tier"
            )
            .setPlaceholder(
                "Select a donor tier"
            )
            .addOptions(options);

    panel.addActionRowComponents(
        row =>
            row.addComponents(menu)
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_add_tier",
                    "Add Tier",
                    ButtonStyle.Primary
                ),

                backButton()
            )
    );

    return [panel];
}

/* ============================================================
   SELECTED TIER
   ============================================================ */

function buildSelectedTier(
    tier = {}
) {
    const active =
        isEnabled(tier.enabled);

    const panel =
        container();

    panel.addTextDisplayComponents(
        panelHeader(
            `ASTER / ${tier.tier_id || "TIER"}`,
            "Manage this donor reward tier."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ◇ Tier\n` +
            `**${tier.tier_id || "Unknown"}**\n\n` +

            `### ◈ Donation\n` +
            `**${safeAmount(tier.amount)} ${
                tier.currency || "USD"
            }**\n\n` +

            `### ♛ Discord Role\n` +
            `${role(tier.role_id)}\n\n` +

            `### ⌘ Status\n` +
            `${enabled(tier.enabled)}`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    `donor_tier_role_${tier.tier_id}`,
                    "Change Role",
                    ButtonStyle.Primary
                ),

                button(
                    `donor_tier_toggle_${tier.tier_id}`,
                    active
                        ? "Disable"
                        : "Enable",
                    active
                        ? ButtonStyle.Danger
                        : ButtonStyle.Success
                ),

                button(
                    `donor_tier_delete_${tier.tier_id}`,
                    "Delete",
                    ButtonStyle.Danger
                )
            )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_manage_tiers",
                    "Back to Tiers",
                    ButtonStyle.Secondary
                )
            )
    );

    return [panel];
}

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
    buildPanel,
    buildVariables,
    buildConfigView,
    buildChannelPicker,
    buildTierRolePicker,
    buildTierManager,
    buildSelectedTier
};