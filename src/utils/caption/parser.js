function parseCaptionArgs(args) {
    const input = args.join(" ").trim();

    if (input === "=") {
        return {
            action: "help"
        };
    }

    if (input.toLowerCase() === "remove") {
        return {
            action: "remove"
        };
    }

    if (!input) {
        return {
            action: "help"
        };
    }

    let caption = input;

    if (
        caption.startsWith('"') &&
        caption.endsWith('"') &&
        caption.length >= 2
    ) {
        caption = caption.slice(1, -1);
    }

    caption = caption.trim();

    if (!caption) {
        return {
            action: "help"
        };
    }

    return {
        action: "set",
        caption
    };
}

module.exports = {
    parseCaptionArgs
};