const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const symbols = require("./symbols");
const styles = require("./styles");

const ACCENT =
    styles?.getTheme?.().colors?.accent ??
    0x7C5CFF;

/* ============================================================
   HELPERS
   ============================================================ */

function text(content) {
    return new TextDisplayBuilder()
        .setContent(
            String(content ?? "")
        );
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

function amount(value) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number.toFixed(0)
        : "0";
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

function header(
    title,
    description
) {
    return text(
        `# ${symbols.brand || "✦"} ${title}\n` +
        `-# ${description}`
    );
}

/* ============================================================
   DONOR VARIABLE REPLACEMENT
   ============================================================ */

/**
 * Supported variables:
 *
 * {user}
 * {username}
 * {member}
 * {guild}
 * {channel}
 * {link}
 * {role}
 * {tier}
 * {amount}
 * {currency}
 */
function replaceDonorVariables(
    message,
    variables = {}
) {
    let output =
        String(message ?? "");

    const {
        guild,
        user,
        member,
        channel,
        role,
        tier,
        amount: donationAmount,
        currency,
        settings
    } = variables;

    const replacements = {
        "{user}":
            user?.id
                ? `<@${user.id}>`
                : "",

        "{username}":
            user?.username
                ? user.username
                : "",

        "{member}":
            member?.id
                ? `<@${member.id}>`
                : user?.id
                    ? `<@${user.id}>`
                    : "",

        "{guild}":
            guild?.name
                ? guild.name
                : "",

        "{channel}":
            channel?.id
                ? `<#${channel.id}>`
                : "",

        "{link}":
            settings?.kofi_url
                ? settings.kofi_url
                : "",

        "{role}":
            role?.id
                ? `<@&${role.id}>`
                : "",

        "{tier}":
            tier != null
                ? String(tier)
                : "",

        "{amount}":
            donationAmount != null
                ? String(donationAmount)
                : "0",

        "{currency}":
            currency != null
                ? String(currency)
                : "USD"
    };

    for (
        const [
            variable,
            value
        ] of Object.entries(
            replacements
        )
    ) {
        output =
            output.replaceAll(
                variable,
                value
            );
    }

    return output;
}

/* ============================================================
   MAIN DONOR PANEL
   ============================================================ */

function buildPanel(
    settings = {},
    tiers = []
) {
    const panel =
        container();

    const activeTiers =
        tiers.filter(
            tier =>
                Number(tier.enabled) === 1
        );

    const message =
        settings.announcement_message ||
        "Thank you {user} for supporting {guild}! 💜";

    panel.addTextDisplayComponents(
        header(
            "ASTER / DONOR SYSTEM",
            "Donation management, announcements, logging and donor rewards."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ◇ System\n` +
            `**Status**  ${enabled(settings.enabled)}\n` +
            `**Ko-fi**  ${kofi(settings.kofi_url)}\n\n` +

            `### ⌘ Announcements\n` +
            `**Status**  ${enabled(settings.announcements_enabled)}\n` +
            `**Channel**  ${channel(settings.announcement_channel_id)}\n\n` +

            `### ◈ Logging\n` +
            `**Status**  ${enabled(settings.logging_enabled)}\n` +
            `**Channel**  ${channel(settings.log_channel_id)}`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    /* --------------------------------------------------------
       System controls
    -------------------------------------------------------- */

    panel.addTextDisplayComponents(
        text("### ✦ System Controls")
    );

    panel.addActionRowComponents(
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

    /* --------------------------------------------------------
       Channel / Ko-fi controls
    -------------------------------------------------------- */

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_kofi",
                    "Ko-fi URL"
                ),

                button(
                    "donor_announcement_channel",
                    "Announcement Channel"
                ),

                button(
                    "donor_log_channel",
                    "Log Channel"
                )
            )
    );

    panel.addSeparatorComponents(
        separator()
    );

    /* --------------------------------------------------------
       Donor tiers
    -------------------------------------------------------- */

    panel.addTextDisplayComponents(
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
            const tier of activeTiers.slice(
                0,
                10
            )
        ) {
            panel.addTextDisplayComponents(
                text(
                    `**◆ ${tier.tier_id}**  •  ` +
                    `**${amount(tier.amount)} ${
                        tier.currency || "USD"
                    }**\n` +
                    `${role(tier.role_id)}`
                )
            );
        }
    } else {
        panel.addTextDisplayComponents(
            text(
                "`No active donor tiers configured.`"
            )
        );
    }

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_tier_add",
                    "Add Tier",
                    ButtonStyle.Primary
                ),

                button(
                    "donor_tier_manage",
                    "Manage Tiers"
                )
            )
    );

    panel.addSeparatorComponents(
        separator()
    );

    /* --------------------------------------------------------
       Announcement
    -------------------------------------------------------- */

    panel.addTextDisplayComponents(
        text(
            `### ✦ Announcement\n` +
            `\`\`\`\n` +
            `${String(message).slice(
                0,
                900
            )}\n` +
            `\`\`\``
        )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_variables",
                    "Variables",
                    ButtonStyle.Primary
                ),

                button(
                    "donor_test",
                    "Test Announcement",
                    ButtonStyle.Success
                )
            )
    );

    panel.addSeparatorComponents(
        separator()
    );

    /* --------------------------------------------------------
       Utility controls
    -------------------------------------------------------- */

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_config_view",
                    "View Config"
                ),

                button(
                    "donor_refresh",
                    "Refresh"
                ),

                button(
                    "donor_reset",
                    "Reset",
                    ButtonStyle.Danger
                )
            )
    );

    panel.addTextDisplayComponents(
        text(
            "-# ASTER Donor System • Administrator configuration"
        )
    );

    return [panel];
}

/* ============================================================
   VARIABLES / GUIDE
   ============================================================ */

function buildVariables() {
    const panel =
        container();

    panel.addTextDisplayComponents(
        header(
            "ASTER / DONOR GUIDE",
            "Dynamic variables available inside donor announcements."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ◇ User Variables\n\n` +

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
            `### ◈ Server Variables\n\n` +

            `**{guild}**\n` +
            `Shows the server name.\n\n` +

            `**{channel}**\n` +
            `Mentions the announcement channel.\n\n` +

            `**{link}**\n` +
            `Inserts your Ko-fi URL.`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ♛ Donation Variables\n\n` +

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
            `> Tier: {tier}\n` +
            `> Donation: {amount} {currency}\n` +
            `> Support: {link}`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ⌘ Setup Checklist\n\n` +
            `◆ Configure Ko-fi\n` +
            `◆ Select announcement channel\n` +
            `◆ Select logging channel\n` +
            `◆ Create donor tiers\n` +
            `◆ Assign donor roles\n` +
            `◆ Customize the message\n` +
            `◆ Run a test`
        )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_config_back",
                    "Back"
                )
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
        header(
            "ASTER / DONOR CONFIG",
            "Current donor configuration."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ◇ General\n` +
            `**System**  ${enabled(settings.enabled)}\n` +
            `**Ko-fi**  ${kofi(settings.kofi_url)}`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ⌘ Announcements\n` +
            `**Enabled**  ${enabled(settings.announcements_enabled)}\n` +
            `**Channel**  ${channel(settings.announcement_channel_id)}\n` +
            `**Message**  ${
                settings.announcement_message
                    ? "Configured"
                    : "Default"
            }`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ◈ Logging\n` +
            `**Enabled**  ${enabled(settings.logging_enabled)}\n` +
            `**Channel**  ${channel(settings.log_channel_id)}`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    const tierText =
        tiers.length
            ? tiers
                .slice(0, 15)
                .map(
                    tier =>
                        `**◆ ${tier.tier_id}** — ` +
                        `${amount(tier.amount)} ${
                            tier.currency || "USD"
                        } — ` +
                        `${role(tier.role_id)} — ` +
                        `${enabled(tier.enabled)}`
                )
                .join("\n")
            : "`No tiers configured.`";

    panel.addTextDisplayComponents(
        text(
            `### ♛ Donor Tiers\n${tierText}`
        )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                button(
                    "donor_config_back",
                    "Back"
                )
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
    const panel =
        container();

    const isAnnouncement =
        type === "announcement";

    const title =
        isAnnouncement
            ? "ANNOUNCEMENT CHANNEL"
            : "LOGGING CHANNEL";

    const customId =
        `donor_channel_select_${type}`;

    panel.addTextDisplayComponents(
        header(
            `ASTER / ${title}`,
            "Choose the Discord channel used by the donor system."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### ◇ Current\n` +
            `${channel(currentId)}`
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
                button(
                    "donor_config_back",
                    "Back"
                )
            )
    );

    return [panel];
}

/* ============================================================
   TIER ROLE PICKER
   ============================================================ */

function buildTierRolePicker(
    tierId,
    donationAmount
) {
    const panel =
        container();

    panel.addTextDisplayComponents(
        header(
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
            `**${amount(donationAmount)}**`
        )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId(
                        `donor_tier_role_${tierId}_${donationAmount}`
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
                    "donor_tier_manage",
                    "Back"
                )
            )
    );

    return [panel];
}

/* ============================================================
   TIER MANAGER
   ============================================================ */

function buildTierManager(
    tiers = []
) {
    const panel =
        container();

    panel.addTextDisplayComponents(
        header(
            "ASTER / DONOR TIERS",
            "Manage donor tiers and their Discord rewards."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    if (!tiers.length) {
        panel.addTextDisplayComponents(
            text(
                `### ✦ No Tiers Yet\n` +
                `There are currently no donor tiers configured.\n\n` +
                `Use **Add Tier** to create the first one.`
            )
        );

        panel.addActionRowComponents(
            row =>
                row.addComponents(
                    button(
                        "donor_tier_add",
                        "Add Tier",
                        ButtonStyle.Primary
                    ),

                    button(
                        "donor_config_back",
                        "Back"
                    )
                )
        );

        return [panel];
    }

    panel.addTextDisplayComponents(
        text(
            `### ◇ Available Tiers\n` +
            `Select a tier to manage it.`
        )
    );

    const options =
        tiers
            .slice(0, 25)
            .map(tier => ({
                label:
                    `${tier.tier_id} — ` +
                    `${amount(tier.amount)} ${
                        tier.currency || "USD"
                    }`,
                description:
                    tier.role_id
                        ? "Discord role configured"
                        : "Discord role not configured",
                value:
                    String(tier.tier_id)
            }));

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                "donor_tier_select"
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
                    "donor_tier_add",
                    "Add Tier",
                    ButtonStyle.Primary
                ),

                button(
                    "donor_config_back",
                    "Back"
                )
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
        Number(tier.enabled) === 1;

    const panel =
        container();

    panel.addTextDisplayComponents(
        header(
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
            `**${amount(tier.amount)} ${
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
                    `donor_tier_role_picker_${tier.tier_id}`,
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
                    "donor_tier_manage",
                    "Back to Tiers"
                )
            )
    );

    return [panel];
}

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
    replaceDonorVariables,

    buildPanel,
    buildVariables,
    buildConfigView,
    buildChannelPicker,
    buildTierRolePicker,
    buildTierManager,
    buildSelectedTier
};