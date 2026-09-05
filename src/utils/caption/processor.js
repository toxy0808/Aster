const path = require("path");

const {
    compressGif
} = require("./compressor");

const SUPPORTED_TYPES = new Set([
    "image/gif",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp"
]);

const GIF_LIMIT = 7 * 1024 * 1024;

function isSupportedAttachment(attachment) {
    if (!attachment) return false;

    const contentType =
        attachment.contentType?.toLowerCase();

    if (contentType && SUPPORTED_TYPES.has(contentType)) {
        return true;
    }

    const extension = path
        .extname(attachment.name || "")
        .toLowerCase();

    return [
        ".gif",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp"
    ].includes(extension);
}

function isGif(attachment) {
    const contentType =
        attachment.contentType?.toLowerCase();

    if (contentType === "image/gif") {
        return true;
    }

    return path
        .extname(attachment.name || "")
        .toLowerCase() === ".gif";
}

async function downloadAttachment(attachment) {
    const response = await fetch(attachment.url);

    if (!response.ok) {
        throw new Error(
            `Failed to download attachment: HTTP ${response.status}`
        );
    }

    return Buffer.from(
        await response.arrayBuffer()
    );
}

async function prepareAttachment(attachment) {
    if (!isSupportedAttachment(attachment)) {
        throw new Error(
            "That attachment type is not supported."
        );
    }

    let buffer =
        await downloadAttachment(attachment);

    const gif = isGif(attachment);

    let compressed = false;

    if (gif && buffer.length > GIF_LIMIT) {
        buffer = await compressGif(
            buffer,
            attachment.name
        );

        compressed = true;
    }

    return {
        buffer,
        name: attachment.name || "attachment",
        isGif: gif,
        compressed
    };
}

module.exports = {
    SUPPORTED_TYPES,
    GIF_LIMIT,
    isSupportedAttachment,
    isGif,
    downloadAttachment,
    prepareAttachment
};