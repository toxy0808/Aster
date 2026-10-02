// ========================================================
// ASTER UI — COMPONENTS V2 BUILDERS
// ========================================================
//
// Discord currently supports these container children:
// Action Row, File, Media Gallery, Section, Separator,
// and Text Display. This layer exposes them without forcing
// commands to know Discord's low-level builder plumbing.
//
// Section accessories are especially useful for compact UI:
// a button or thumbnail can sit beside the section text.
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

function separator(spacing = SeparatorSpacingSize.Small, divider = true) {
    return new SeparatorBuilder()
        .setSpacing(spacing)
        .setDivider(divider);
}

function header(title, symbol = styles.headers.default) {
    return text(`## ${symbol} ${title}`);
}

function section(title, content = "", symbol = styles.headers.section) {
    const builder = new SectionBuilder()
        .addTextDisplayComponents(
            text(`### ${symbol} ${title}`),
            text(content)
        );

    return builder;
}

function compactSection(title, content = "", accessory) {
    const builder = new SectionBuilder()
        .addTextDisplayComponents(
            text(`### ${title}`),
            text(content)
        );

    if (accessory) setSectionAccessory(builder, accessory);
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
                throw new TypeError("Unsupported Section button style.");
        }
    }

    throw new TypeError("Unsupported Section accessory.");
}

function button(customId, label, style = ButtonStyle.Secondary, options = {}) {
    const builder = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(style);

    if (options.emoji) builder.setEmoji(options.emoji);
    if (options.disabled) builder.setDisabled(true);

    return builder;
}

function linkButton(url, label, options = {}) {
    const builder = new ButtonBuilder()
        .setURL(url)
        .setLabel(label)
        .setStyle(ButtonStyle.Link);

    if (options.emoji) builder.setEmoji(options.emoji);

    return builder;
}

function actionRow(...buttons) {
    return new ActionRowBuilder().addComponents(buttons.flat().filter(Boolean));
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
        .addItems(items.flat().filter(Boolean));
}

function file(url, spoiler = false) {
    const builder = new FileBuilder().setURL(url);
    if (spoiler && typeof builder.setSpoiler === "function") builder.setSpoiler(true);
    return builder;
}

function stat(label, value, symbol = styles.sections.activity) {
    return text(`**${symbol} ${label}**\n${value}`);
}

function status(label, value, type = "info") {
    const theme = styles.getTheme();
    const symbol = theme.status[type] || theme.status.info;
    return text(`**${symbol} ${label}**\n${value}`);
}

function container(...components) {
    return new ContainerBuilder().addComponents(...flattenSupported(components));
}

function panel({
    title,
    symbol = styles.brand.symbol,
    components = [],
    accentColor,
    spoiler = false
} = {}) {
    const output = new ContainerBuilder();

    if (accentColor !== null) {
        output.setAccentColor(accentColor ?? styles.getTheme().colors.accent);
    }

    if (spoiler) output.setSpoiler(true);

    if (title) output.addTextDisplayComponents(header(title, symbol));

    output.addComponents(...flattenSupported(components));
    return output;
}

function separated(...components) {
    const output = [];
    for (const [index, component] of components.flat().filter(Boolean).entries()) {
        if (index > 0) output.push(separator());
        output.push(component);
    }
    return output;
}

function flattenSupported(input) {
    const values = input.flat(Infinity).filter(Boolean);

    return values.map((component) => {
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
            `Unsupported ASTER UI component: ${component?.constructor?.name || typeof component}`
        );
    });
}

module.exports = {
    text,
    separator,
    header,
    section,
    compactSection,
    setSectionAccessory,
    stat,
    status,
    button,
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
