// ========================================================
// ASTER UI — PREMIUM COMPONENTS V2
// ========================================================

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    FileBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder
} = require("discord.js");

const styles = require("./styles");

function text(content = "") {
    return new TextDisplayBuilder().setContent(String(content));
}

function header(title, symbol = styles.brand.symbol) {
    return text(`## ${symbol} ${title}`);
}

function subtitle(content = "") {
    return text(`-# ${content}`);
}

function separator(
    spacing = SeparatorSpacingSize.Small,
    divider = true
) {
    return new SeparatorBuilder()
        .setSpacing(spacing)
        .setDivider(divider);
}

/**
 * Premium compact information section.
 */
function section(title, content = "", symbol = styles.headers.section) {
    const builder = new SectionBuilder();

    builder.addTextDisplayComponents(
        text(`### ${symbol} ${title}`),
        text(content)
    );

    return builder;
}

/**
 * Section without forcing a symbol.
 */
function compactSection(title, content = "", accessory = null) {
    const builder = new SectionBuilder()
        .addTextDisplayComponents(
            text(`### ${title}`),
            text(content)
        );

    if (accessory) {
        setSectionAccessory(builder, accessory);
    }

    return builder;
}

function setSectionAccessory(builder, accessory) {
    if (!accessory) return builder;

    if (accessory instanceof ThumbnailBuilder) {
        return builder.setThumbnailAccessory(accessory);
    }

    if (accessory instanceof ButtonBuilder) {
        switch (accessory.data?.style) {
            case ButtonStyle.Primary:
                return builder.setPrimaryButtonAccessory(accessory);

            case ButtonStyle.Secondary:
                return builder.setSecondaryButtonAccessory(accessory);

            case ButtonStyle.Success:
                return builder.setSuccessButtonAccessory(accessory);

            case ButtonStyle.Danger:
                return builder.setDangerButtonAccessory(accessory);

            case ButtonStyle.Link:
                return builder.setLinkButtonAccessory(accessory);

            default:
                throw new TypeError(
                    "Unsupported button style for Section accessory."
                );
        }
    }

    throw new TypeError(
        `Unsupported Section accessory: ${
            accessory?.constructor?.name || typeof accessory
        }`
    );
}

/**
 * ASTER button.
 */
function button(
    customId,
    label,
    style = ButtonStyle.Secondary,
    options = {}
) {
    const builder = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(style);

    if (options.emoji) {
        builder.setEmoji(options.emoji);
    }

    if (options.disabled) {
        builder.setDisabled(true);
    }

    return builder;
}

function primaryButton(customId, label, options = {}) {
    return button(
        customId,
        label,
        ButtonStyle.Primary,
        options
    );
}

function secondaryButton(customId, label, options = {}) {
    return button(
        customId,
        label,
        ButtonStyle.Secondary,
        options
    );
}

function successButton(customId, label, options = {}) {
    return button(
        customId,
        label,
        ButtonStyle.Success,
        options
    );
}

function dangerButton(customId, label, options = {}) {
    return button(
        customId,
        label,
        ButtonStyle.Danger,
        options
    );
}

function linkButton(url, label, options = {}) {
    const builder = new ButtonBuilder()
        .setURL(url)
        .setLabel(label)
        .setStyle(ButtonStyle.Link);

    if (options.emoji) {
        builder.setEmoji(options.emoji);
    }

    return builder;
}

function actionRow(...buttons) {
    return new ActionRowBuilder()
        .addComponents(
            buttons
                .flat(Infinity)
                .filter(Boolean)
        );
}

function thumbnail(url, description = "ASTER") {
    return new ThumbnailBuilder()
        .setURL(url)
        .setDescription(description);
}

function mediaItem(url, description = "") {
    return new MediaGalleryItemBuilder()
        .setURL(url)
        .setDescription(description);
}

function mediaGallery(...items) {
    return new MediaGalleryBuilder()
        .addItems(
            items
                .flat(Infinity)
                .filter(Boolean)
        );
}

function file(url, spoiler = false) {
    const builder = new FileBuilder()
        .setURL(url);

    if (
        spoiler &&
        typeof builder.setSpoiler === "function"
    ) {
        builder.setSpoiler(true);
    }

    return builder;
}

/**
 * Compact statistic.
 */
function stat(
    label,
    value,
    symbol = styles.sections.activity
) {
    return text(
        `**${symbol} ${label}**\n${value}`
    );
}

/**
 * Premium status line.
 */
function status(
    label,
    value,
    type = "info"
) {
    const theme = styles.getTheme();
    const symbol =
        theme.status[type] ||
        theme.status.info;

    return text(
        `**${symbol} ${label}**  ${value}`
    );
}

/**
 * Small key/value row.
 */
function field(label, value) {
    return text(
        `**${label}**\n${value}`
    );
}

/**
 * Compact metric row.
 */
function metrics(items = []) {
    return text(
        items
            .filter(Boolean)
            .map(
                item =>
                    `**${item.label}** ${item.value}`
            )
            .join("  ·  ")
    );
}

/**
 * Basic container.
 */
function container(...components) {
    return new ContainerBuilder()
        .addComponents(
            flattenSupported(components)
        );
}

/**
 * Main ASTER panel.
 *
 * This is the preferred helper for new UIs.
 */
function panel({
    title,
    description,
    symbol = styles.brand.symbol,
    components = [],
    accentColor,
    spoiler = false
} = {}) {
    const output = new ContainerBuilder();

    output.setAccentColor(
        accentColor ??
        styles.getTheme().colors.accent
    );

    if (spoiler) {
        output.setSpoiler(true);
    }

    if (title) {
        output.addTextDisplayComponents(
            header(title, symbol)
        );
    }

    if (description) {
        output.addTextDisplayComponents(
            subtitle(description)
        );
    }

    output.addComponents(
        ...flattenSupported(components)
    );

    return output;
}

/**
 * Creates a visually separated group.
 */
function separated(...components) {
    const output = [];

    for (
        const [index, component]
        of components
            .flat(Infinity)
            .filter(Boolean)
            .entries()
    ) {
        if (index > 0) {
            output.push(separator());
        }

        output.push(component);
    }

    return output;
}

function flattenSupported(input) {
    return input
        .flat(Infinity)
        .filter(Boolean)
        .map(component => {
            if (
                component instanceof TextDisplayBuilder ||
                component instanceof SeparatorBuilder ||
                component instanceof SectionBuilder ||
                component instanceof ActionRowBuilder ||
                component instanceof MediaGalleryBuilder ||
                component instanceof FileBuilder
            ) {
                return component;
            }

            throw new TypeError(
                `Unsupported ASTER UI component: ${
                    component?.constructor?.name ||
                    typeof component
                }`
            );
        });
}

module.exports = {
    text,
    header,
    subtitle,

    separator,

    section,
    compactSection,
    setSectionAccessory,

    stat,
    status,
    field,
    metrics,

    button,
    primaryButton,
    secondaryButton,
    successButton,
    dangerButton,
    linkButton,

    actionRow,

    thumbnail,
    mediaItem,
    mediaGallery,
    file,

    container,
    panel,
    separated
};