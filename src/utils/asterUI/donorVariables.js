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

const symbols =
    require("./symbols");

const ACCENT = 0xFF4DA6;

/* =========================================================
   Helpers
========================================================= */

function text(content) {
    return new TextDisplayBuilder()
        .setContent(String(content ?? ""));
}

function separator() {
    return new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small);
}

function container(...components) {
    return new ContainerBuilder()
        .setAccentColor(ACCENT)
        .addTextDisplayComponents(
            ...components.filter(
                component =>
                    component instanceof TextDisplayBuilder
            )
        );
}

function enabled(value) {
    return Number(value) === 1
        ? "Enabled"
        : "Disabled";
}

function channel(id) {
    return id
        ? `<#${id}>`
        : "Not configured";
}

function role(id) {
    return id
        ? `<@&${id}>`
        : "Not configured";
}

function kofi(url) {
    return url
        ? `[Ko-fi](${url})`
        : "Not configured";
}

/* =========================================================
   Donor variable replacement
========================================================= */

/**
 * Replaces donor announcement variables.
 *
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
        amount,
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
            amount != null
                ? String(amount)
                : "0",

        "{currency}":
            currency != null
                ? String(currency)
                : "USD"
    };

    for (
        const [variable, value]
        of Object.entries(replacements)
    ) {
        output = output.replaceAll(
            variable,
            value
        );
    }

    return output;
}

/* =========================================================
   Main donor configuration panel
========================================================= */

function buildPanel(
    settings,
    tiers = []
) {
    const panel =
        new ContainerBuilder()
            .setAccentColor(ACCENT);

    panel.addTextDisplayComponents(
        text(
            "# 💜 ASTER Donor System\n" +
            "Configure donations, Ko-fi integration, announcement messages, and donor tiers."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            "### ⚙️ Configuration\n" +
            `**Announcements:** ${enabled(settings?.announcements_enabled)}\n` +
            `**Announcement Channel:** ${channel(settings?.announcement_channel_id)}\n` +
            `**Ko-fi Webhook:** ${enabled(settings?.kofi_enabled)}\n` +
            `**Ko-fi Link:** ${kofi(settings?.kofi_url)}`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "donor_toggle_announcements"
                    )
                    .setLabel(
                        Number(settings?.announcements_enabled) === 1
                            ? "Disable Announcements"
                            : "Enable Announcements"
                    )
                    .setStyle(
                        Number(settings?.announcements_enabled) === 1
                            ? ButtonStyle.Danger
                            : ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "donor_toggle_kofi"
                    )
                    .setLabel(
                        Number(settings?.kofi_enabled) === 1
                            ? "Disable Ko-fi"
                            : "Enable Ko-fi"
                    )
                    .setStyle(
                        Number(settings?.kofi_enabled) === 1
                            ? ButtonStyle.Danger
                            : ButtonStyle.Success
                    )
            )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "donor_channel_announcement"
                    )
                    .setLabel(
                        "Announcement Channel"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "donor_kofi_settings"
                    )
                    .setLabel(
                        "Ko-fi Settings"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### 🏆 Donor Tiers\n` +
            `Configured tiers: **${tiers.length}**`
        )
    );

    if (tiers.length) {
        for (const tier of tiers) {
            panel.addTextDisplayComponents(
                text(
                    `**${tier.tier_id}** — ${tier.amount} ${tier.currency || "USD"}\n` +
                    `Role: ${role(tier.role_id)}\n` +
                    `Status: ${enabled(tier.enabled)}`
                )
            );
        }
    } else {
        panel.addTextDisplayComponents(
            text(
                "No donor tiers have been configured yet."
            )
        );
    }

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "donor_tier_add"
                    )
                    .setLabel(
                        "Add Tier"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "donor_tier_manage"
                    )
                    .setLabel(
                        "Manage Tiers"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    )
            )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "donor_variables"
                    )
                    .setLabel(
                        "Variables"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "donor_config_view"
                    )
                    .setLabel(
                        "View Config"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "donor_test"
                    )
                    .setLabel(
                        "Test Announcement"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    )
            )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "donor_reset"
                    )
                    .setLabel(
                        "Reset Donor System"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    )
            )
    );

    return [panel];
}

/* =========================================================
   Variable reference
========================================================= */

function buildVariables() {
    const panel =
        new ContainerBuilder()
            .setAccentColor(ACCENT);

    panel.addTextDisplayComponents(
        text(
            "# 🧩 Donor Variables\n" +
            "These variables can be used in donor announcement messages."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            "**{user}**\n" +
            "Mentions the user who made the donation.\n\n" +

            "**{username}**\n" +
            "Displays the donor's username.\n\n" +

            "**{member}**\n" +
            "Mentions the donor as a server member.\n\n" +

            "**{guild}**\n" +
            "Displays the server name.\n\n" +

            "**{channel}**\n" +
            "Mentions the configured announcement channel.\n\n" +

            "**{link}**\n" +
            "Displays the configured Ko-fi URL.\n\n" +

            "**{role}**\n" +
            "Mentions the donor tier role.\n\n" +

            "**{tier}**\n" +
            "Displays the donor tier ID/name.\n\n" +

            "**{amount}**\n" +
            "Displays the donation amount.\n\n" +

            "**{currency}**\n" +
            "Displays the donation currency."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            "**Example:**\n" +
            "Thank you {user} for supporting {guild} with a {tier} donation of {amount} {currency}! 💜"
        )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "donor_config_back"
                    )
                    .setLabel(
                        "Back"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    );

    return [panel];
}

/* =========================================================
   Configuration view
========================================================= */

function buildConfigView(
    settings,
    tiers = []
) {
    const panel =
        new ContainerBuilder()
            .setAccentColor(ACCENT);

    panel.addTextDisplayComponents(
        text(
            "# ⚙️ Donor Configuration"
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `**Announcements:** ${enabled(settings?.announcements_enabled)}\n` +
            `**Announcement Channel:** ${channel(settings?.announcement_channel_id)}\n\n` +

            `**Ko-fi:** ${enabled(settings?.kofi_enabled)}\n` +
            `**Ko-fi URL:** ${kofi(settings?.kofi_url)}\n\n` +

            `**Announcement Message:**\n` +
            `${settings?.announcement_message || "Not configured"}`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `### 🏆 Tiers (${tiers.length})`
        )
    );

    if (tiers.length) {
        for (const tier of tiers) {
            panel.addTextDisplayComponents(
                text(
                    `**${tier.tier_id}**\n` +
                    `Amount: ${tier.amount} ${tier.currency || "USD"}\n` +
                    `Role: ${role(tier.role_id)}\n` +
                    `Enabled: ${enabled(tier.enabled)}`
                )
            );
        }
    } else {
        panel.addTextDisplayComponents(
            text(
                "No tiers configured."
            )
        );
    }

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "donor_config_back"
                    )
                    .setLabel(
                        "Back"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    );

    return [panel];
}

/* =========================================================
   Announcement channel picker
========================================================= */

function buildChannelPicker(
    type,
    currentId
) {
    const panel =
        new ContainerBuilder()
            .setAccentColor(ACCENT);

    const picker =
        new ChannelSelectMenuBuilder()
            .setCustomId(
                `donor_channel_select_${type}`
            )
            .setPlaceholder(
                currentId
                    ? "Change announcement channel"
                    : "Select announcement channel"
            )
            .setMinValues(1)
            .setMaxValues(1);

    panel.addTextDisplayComponents(
        text(
            "# 📢 Announcement Channel\n" +
            (
                currentId
                    ? `Current channel: <#${currentId}>`
                    : "No announcement channel configured."
            )
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                picker
            )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "donor_config_back"
                    )
                    .setLabel(
                        "Back"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    );

    return [panel];
}

/* =========================================================
   Donor tier role picker
========================================================= */

function buildTierRolePicker(
    tierId,
    amount
) {
    const panel =
        new ContainerBuilder()
            .setAccentColor(ACCENT);

    const picker =
        new RoleSelectMenuBuilder()
            .setCustomId(
                `donor_tier_role_${tierId}_${amount}`
            )
            .setPlaceholder(
                "Select the donor tier role"
            )
            .setMinValues(1)
            .setMaxValues(1);

    panel.addTextDisplayComponents(
        text(
            `# 🎭 Role for ${tierId}\n` +
            `Donation amount: **${amount}**`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                picker
            )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "donor_tier_manage"
                    )
                    .setLabel(
                        "Back"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    );

    return [panel];
}

/* =========================================================
   Tier manager
========================================================= */

function buildTierManager(
    tiers = []
) {
    const panel =
        new ContainerBuilder()
            .setAccentColor(ACCENT);

    panel.addTextDisplayComponents(
        text(
            "# 🏆 Donor Tier Manager\n" +
            "Select a donor tier to manage."
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    if (!tiers.length) {
        panel.addTextDisplayComponents(
            text(
                "No donor tiers have been configured."
            )
        );
    } else {
        const options =
            tiers.map(tier => ({
                label:
                    String(tier.tier_id).slice(
                        0,
                        100
                    ),
                description:
                    `${tier.amount} ${tier.currency || "USD"} • ` +
                    `${Number(tier.enabled) === 1 ? "Enabled" : "Disabled"}`.slice(
                        0,
                        100
                    ),
                value:
                    String(tier.tier_id)
            }));

        const select =
            new StringSelectMenuBuilder()
                .setCustomId(
                    "donor_tier_select"
                )
                .setPlaceholder(
                    "Select a donor tier"
                )
                .addOptions(
                    options
                );

        panel.addActionRowComponents(
            row =>
                row.addComponents(
                    select
                )
        );
    }

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "donor_tier_add"
                    )
                    .setLabel(
                        "Add Tier"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "donor_config_back"
                    )
                    .setLabel(
                        "Back"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    );

    return [panel];
}

/* =========================================================
   Selected tier
========================================================= */

function buildSelectedTier(
    tier
) {
    const panel =
        new ContainerBuilder()
            .setAccentColor(ACCENT);

    panel.addTextDisplayComponents(
        text(
            `# 🏆 ${tier.tier_id}`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    panel.addTextDisplayComponents(
        text(
            `**Amount:** ${tier.amount} ${tier.currency || "USD"}\n` +
            `**Role:** ${role(tier.role_id)}\n` +
            `**Status:** ${enabled(tier.enabled)}`
        )
    );

    panel.addSeparatorComponents(
        separator()
    );

    /*
     * IMPORTANT:
     * The interaction handler expects the tier role
     * custom ID to contain both the tier ID and amount.
     */
    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        `donor_tier_toggle_${tier.tier_id}`
                    )
                    .setLabel(
                        Number(tier.enabled) === 1
                            ? "Disable Tier"
                            : "Enable Tier"
                    )
                    .setStyle(
                        Number(tier.enabled) === 1
                            ? ButtonStyle.Danger
                            : ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `donor_tier_delete_${tier.tier_id}`
                    )
                    .setLabel(
                        "Delete Tier"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    )
            )
    );

    /*
     * This opens the role picker instead of pretending
     * the button itself is a RoleSelectMenu interaction.
     */
    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        `donor_tier_role_picker_${tier.tier_id}`
                    )
                    .setLabel(
                        "Change Role"
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    )
            )
    );

    panel.addActionRowComponents(
        row =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "donor_tier_manage"
                    )
                    .setLabel(
                        "Back"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            )
    );

    return [panel];
}

/* =========================================================
   Exports
========================================================= */

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