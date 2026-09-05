// ========================================================
// ASTER UI — COMPONENTS V2 SECTIONS
// ========================================================

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require("discord.js");

const styles = require("./styles");
const symbols = require("./symbols");

// --------------------------------------------------------
// TEXT
// --------------------------------------------------------

function text(content) {
    return new TextDisplayBuilder()
        .setContent(content);
}

// --------------------------------------------------------
// SEPARATOR
// --------------------------------------------------------

function separator(
    spacing = SeparatorSpacingSize.Small
) {
    return new SeparatorBuilder()
        .setSpacing(spacing);
}

// --------------------------------------------------------
// HEADER
// --------------------------------------------------------

function header(
    title,
    symbol = styles.headers.default
) {
    return text(`## ${symbol} ${title}`);
}

// --------------------------------------------------------
// SECTION
// --------------------------------------------------------

function section(
    title,
    content,
    symbol = styles.headers.section
) {
    return [
        text(`### ${symbol} ${title}`),
        text(content)
    ];
}

// --------------------------------------------------------
// STAT
// --------------------------------------------------------

function stat(
    label,
    value,
    symbol = styles.sections.activity
) {
    return text(
        `**${symbol} ${label}**\n${value}`
    );
}

// --------------------------------------------------------
// STATUS
// --------------------------------------------------------

function status(
    label,
    value,
    type = "info"
) {
    const symbol =
        styles.status[type] ||
        styles.status.info;

    return text(
        `**${symbol} ${label}**\n${value}`
    );
}

// --------------------------------------------------------
// CONTAINER
// --------------------------------------------------------

function container(...components) {
    const output = new ContainerBuilder();

    for (const component of components.flat()) {
        if (!component) continue;

        if (component instanceof SeparatorBuilder) {
            output.addSeparatorComponents(component);
            continue;
        }

        if (component instanceof TextDisplayBuilder) {
            output.addTextDisplayComponents(component);
        }
    }

    return output;
}

// --------------------------------------------------------
// SEPARATOR + CONTENT
// --------------------------------------------------------

function separated(...components) {
    const output = [];

    components
        .flat()
        .forEach((component, index) => {
            if (index > 0) {
                output.push(separator());
            }

            output.push(component);
        });

    return output;
}

// --------------------------------------------------------
// EXPORTS
// --------------------------------------------------------

module.exports = {
    text,
    separator,
    header,
    section,
    stat,
    status,
    container,
    separated
};