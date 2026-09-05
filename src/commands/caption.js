const { AttachmentBuilder } = require("discord.js");
const sharp = require("sharp");
const twemoji = require("twemoji");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_PIXELS = 100_000_000;
const DOWNLOAD_TIMEOUT = 30_000;

const activeJobs = new Set();

/* =========================================================
   DOWNLOAD
========================================================= */

function downloadBuffer(url, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 5) {
            return reject(new Error("Too many redirects."));
        }

        let parsed;

        try {
            parsed = new URL(url);
        } catch {
            return reject(new Error("Invalid URL."));
        }

        const client = parsed.protocol === "https:" ? https : http;

        const req = client.get(
            parsed,
            {
                headers: {
                    "User-Agent": "ASTER Discord Bot"
                }
            },
            res => {
                if (
                    res.statusCode >= 300 &&
                    res.statusCode < 400 &&
                    res.headers.location
                ) {
                    res.resume();

                    const nextUrl = new URL(
                        res.headers.location,
                        parsed
                    ).toString();

                    return downloadBuffer(nextUrl, redirects + 1)
                        .then(resolve)
                        .catch(reject);
                }

                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(
                        new Error(`HTTP ${res.statusCode}`)
                    );
                }

                const chunks = [];
                let total = 0;

                res.on("data", chunk => {
                    total += chunk.length;

                    if (total > MAX_FILE_SIZE) {
                        req.destroy();
                        reject(
                            new Error("File is too large.")
                        );
                        return;
                    }

                    chunks.push(chunk);
                });

                res.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });

                res.on("error", reject);
            }
        );

        req.setTimeout(DOWNLOAD_TIMEOUT, () => {
            req.destroy(
                new Error("Download timed out.")
            );
        });

        req.on("error", reject);
    });
}

/* =========================================================
   FIND IMAGE / GIF
========================================================= */

function getReferencedAttachment(message) {
    const reference = message.reference;

    if (!reference?.messageId) {
        return null;
    }

    const referencedMessage =
        message.channel.messages.cache.get(
            reference.messageId
        );

    if (!referencedMessage) {
        return null;
    }

    const attachment = referencedMessage.attachments.find(
        a => /\.(png|jpe?g|gif|webp|avif)$/i.test(
            a.name || a.url
        )
    );

    return attachment || null;
}

async function fetchReference(message) {
    const attachment =
        getReferencedAttachment(message);

    if (attachment) {
        return attachment;
    }

    if (!message.reference?.messageId) {
        return null;
    }

    try {
        const referencedMessage =
            await message.channel.messages.fetch(
                message.reference.messageId
            );

        return (
            referencedMessage.attachments.find(
                a =>
                    /\.(png|jpe?g|gif|webp|avif)$/i.test(
                        a.name || a.url
                    )
            ) || null
        );
    } catch {
        return null;
    }
}

function getOwnAttachment(message) {
    return (
        message.attachments.find(
            a =>
                /\.(png|jpe?g|gif|webp|avif)$/i.test(
                    a.name || a.url
                )
        ) || null
    );
}

/* =========================================================
   EMOJI DETECTION
========================================================= */

const segmenter = new Intl.Segmenter(undefined, {
    granularity: "grapheme"
});

function isEmojiCluster(text) {
    if (!text) return false;

    // Normal emoji / ZWJ emoji / emoji with modifiers
    if (/\p{Extended_Pictographic}/u.test(text)) {
        return true;
    }

    // Flags
    if (/^\p{Regional_Indicator}{2}$/u.test(text)) {
        return true;
    }

    // Keycaps
    if (/^[0-9#*]\uFE0F?\u20E3$/u.test(text)) {
        return true;
    }

    return false;
}

function splitCaption(text) {
    const parts = [];

    for (const item of segmenter.segment(text)) {
        const segment = item.segment;

        if (isEmojiCluster(segment)) {
            parts.push({
                type: "emoji",
                value: segment
            });
        } else {
            parts.push({
                type: "text",
                value: segment
            });
        }
    }

    return parts;
}

/* =========================================================
   TWEMOJI SVG
========================================================= */

async function getEmojiSvg(emoji) {
    const codePoint =
        twemoji.convert.toCodePoint(emoji);

    const url =
        `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoint}.svg`;

    return await downloadBuffer(url);
}

/* =========================================================
   FONT SIZE
========================================================= */

function calculateFontSize(width, text) {
    const length = [...text].length;

    let size;

    if (length <= 12) {
        size = Math.round(width * 0.105);
    } else if (length <= 20) {
        size = Math.round(width * 0.085);
    } else if (length <= 35) {
        size = Math.round(width * 0.068);
    } else if (length <= 55) {
        size = Math.round(width * 0.055);
    } else if (length <= 80) {
        size = Math.round(width * 0.045);
    } else {
        size = Math.round(width * 0.038);
    }

    return Math.max(28, Math.min(110, size));
}

/* =========================================================
   SVG TEXT
========================================================= */

function escapeXml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/* =========================================================
   CREATE CAPTION SVG
========================================================= */

async function createCaptionSvg(
    width,
    caption,
    fontSize
) {
    const parts = splitCaption(caption);

    /*
     * Build one SVG containing:
     * - normal text as <text>
     * - actual Twemoji SVGs as embedded <image>
     *
     * NO twemoji.parse()
     */

    const paddingX = Math.round(fontSize * 0.55);
    const paddingY = Math.round(fontSize * 0.45);

    const availableWidth =
        width - paddingX * 2;

    const estimatedCharWidth =
        fontSize * 0.55;

    const maxCharsPerLine = Math.max(
        1,
        Math.floor(
            availableWidth /
                estimatedCharWidth
        )
    );

    const lines = [];
    let currentLine = [];
    let currentLength = 0;

    for (const part of parts) {
        const value =
            part.type === "emoji"
                ? "😀"
                : part.value;

        const valueLength =
            [...value].length;

        if (
            currentLength + valueLength >
                maxCharsPerLine &&
            currentLine.length > 0
        ) {
            lines.push(currentLine);
            currentLine = [];
            currentLength = 0;
        }

        currentLine.push(part);
        currentLength += valueLength;
    }

    if (currentLine.length > 0) {
        lines.push(currentLine);
    }

    const lineHeight =
        Math.round(fontSize * 1.2);

    const height =
        paddingY * 2 +
        lines.length * lineHeight;

    /*
     * Load all emoji SVGs first.
     */

    const emojiImages = [];

    for (const line of lines) {
        for (const part of line) {
            if (part.type !== "emoji") {
                continue;
            }

            const svg =
                await getEmojiSvg(
                    part.value
                );

            emojiImages.push({
                emoji: part.value,
                svg
            });
        }
    }

    let emojiIndex = 0;

    /*
     * Approximate inline layout.
     */

    const elements = [];

    lines.forEach((line, lineIndex) => {
        const y =
            paddingY +
            lineIndex * lineHeight +
            fontSize;

        let lineWidth = 0;

        for (const part of line) {
            if (part.type === "emoji") {
                lineWidth += fontSize;
            } else {
                lineWidth +=
                    [...part.value].length *
                    estimatedCharWidth;
            }
        }

        let x =
            (width - lineWidth) / 2;

        for (const part of line) {
            if (part.type === "emoji") {
                const emoji =
                    emojiImages[emojiIndex++];

                const base64 =
                    emoji.svg.toString(
                        "base64"
                    );

                elements.push(`
                    <image
                        href="data:image/svg+xml;base64,${base64}"
                        x="${x}"
                        y="${y - fontSize}"
                        width="${fontSize}"
                        height="${fontSize}"
                    />
                `);

                x += fontSize;
            } else {
                const value =
                    escapeXml(part.value);

                elements.push(`
                    <text
                        x="${x}"
                        y="${y}"
                        font-family="Arial, Helvetica, sans-serif"
                        font-size="${fontSize}px"
                        font-weight="700"
                        fill="#111111"
                    >${value}</text>
                `);

                x +=
                    [...part.value].length *
                    estimatedCharWidth;
            }
        }
    });

    return {
        svg: Buffer.from(`
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="${width}"
                height="${height}"
            >
                <rect
                    x="0"
                    y="0"
                    width="${width}"
                    height="${height}"
                    fill="white"
                />

                ${elements.join("\n")}
            </svg>
        `),
        height
    };
}

/* =========================================================
   STATIC IMAGE
========================================================= */

async function renderStatic(
    input,
    caption
) {
    const image =
        sharp(input, {
            limitInputPixels: MAX_PIXELS
        });

    const metadata =
        await image.metadata();

    const width =
        metadata.width;

    if (!width) {
        throw new Error(
            "Could not determine image width."
        );
    }

    const fontSize =
        calculateFontSize(
            width,
            caption
        );

    const captionLayer =
        await createCaptionSvg(
            width,
            caption,
            fontSize
        );

    return await sharp({
        create: {
            width,
            height:
                captionLayer.height +
                (metadata.height || 0),
            channels: 4,
            background: {
                r: 255,
                g: 255,
                b: 255,
                alpha: 1
            }
        }
    })
        .composite([
            {
                input: captionLayer.svg,
                top: 0,
                left: 0
            },
            {
                input: await image
                    .ensureAlpha()
                    .toBuffer(),
                top: captionLayer.height,
                left: 0
            }
        ])
        .png()
        .toBuffer();
}

/* =========================================================
   GIF
========================================================= */

async function renderGif(
    input,
    caption
) {
    const metadata =
        await sharp(input, {
            animated: true,
            limitInputPixels: MAX_PIXELS
        }).metadata();

    const frameCount =
        metadata.pages || 1;

    const frameHeight =
        metadata.pageHeight ||
        metadata.height;

    const width =
        metadata.width;

    if (
        !width ||
        !frameHeight ||
        !frameCount
    ) {
        throw new Error(
            "Could not read GIF dimensions."
        );
    }

    /*
     * Read original GIF metadata so timing,
     * looping and duplicate frames can be retained.
     */

    const original =
        await sharp(input, {
            animated: true,
            limitInputPixels: MAX_PIXELS
        })
            .raw()
            .toBuffer({
                resolveWithObject: true
            });

    /*
     * Sharp exposes GIF delay information through
     * metadata in supported versions.
     */

    let originalDelays =
        metadata.delay;

    if (!Array.isArray(originalDelays)) {
        originalDelays = Array(
            frameCount
        ).fill(
            typeof originalDelays === "number"
                ? originalDelays
                : 100
        );
    }

    if (
        originalDelays.length !==
        frameCount
    ) {
        originalDelays = Array(
            frameCount
        ).fill(
            originalDelays[0] || 100
        );
    }

    const originalLoop =
        typeof metadata.loop === "number"
            ? metadata.loop
            : 0;

    const fontSize =
        calculateFontSize(
            width,
            caption
        );

    const captionLayer =
        await createCaptionSvg(
            width,
            caption,
            fontSize
        );

    /*
     * Create the caption strip.
     */

    const captionBuffer =
        await sharp(
            captionLayer.svg
        )
            .png()
            .toBuffer();

    /*
     * Decode the GIF into all frames.
     */

    const frames =
        await sharp(input, {
            animated: true,
            limitInputPixels: MAX_PIXELS
        })
            .ensureAlpha()
            .raw()
            .toBuffer();

    const frameSize =
        width *
        frameHeight *
        4;

    const outputFrames = [];

    for (
        let i = 0;
        i < frameCount;
        i++
    ) {
        const frame =
            frames.subarray(
                i * frameSize,
                (i + 1) * frameSize
            );

        const output =
            await sharp({
                create: {
                    width,
                    height:
                        captionLayer.height +
                        frameHeight,
                    channels: 4,
                    background: {
                        r: 255,
                        g: 255,
                        b: 255,
                        alpha: 1
                    }
                }
            })
                .composite([
                    {
                        input: captionBuffer,
                        top: 0,
                        left: 0
                    },
                    {
                        input: frame,
                        raw: {
                            width,
                            height: frameHeight,
                            channels: 4
                        },
                        top:
                            captionLayer.height,
                        left: 0
                    }
                ])
                .raw()
                .toBuffer();

        outputFrames.push(output);
    }

    /*
     * Rebuild the animated GIF.
     */

    const combined =
        Buffer.concat(outputFrames);

    return await sharp(combined, {
        raw: {
            width,
            height:
                captionLayer.height +
                frameHeight,
            channels: 4,
            pages: frameCount
        },
        animated: true,
        pageHeight:
            captionLayer.height +
            frameHeight
    })
        .gif({
            reuse: true,
            delay: originalDelays,
            loop: originalLoop,
            keepDuplicateFrames: true,
            effort: 3,
            colours: 256
        })
        .toBuffer();
}

/* =========================================================
   MAIN
========================================================= */

module.exports = {
    name: "caption",
    aliases: ["cap"],
    description:
        "Add a white caption to an image or GIF.",

    async execute(message) {
        const userId = message.author.id;

        if (activeJobs.has(userId)) {
            return message.reply(
                "You already have a caption job running."
            );
        }

        /*
         * Parse the command directly from message.content.
         * This is necessary because the normal dispatcher
         * destroys quoted spacing.
         */

        const match =
            message.content.match(
                /^\s*,(?:caption|cap)\s+([\s\S]+?)\s*$/
            );

        if (!match) {
            return message.reply(
                'Usage: `,caption "your text"`'
            );
        }

        let caption =
            match[1].trim();

        /*
         * Remove surrounding quotes.
         */

        if (
            caption.length >= 2 &&
            (
                (
                    caption.startsWith('"') &&
                    caption.endsWith('"')
                ) ||
                (
                    caption.startsWith("'") &&
                    caption.endsWith("'")
                )
            )
        ) {
            caption =
                caption.slice(
                    1,
                    -1
                );
        }

        caption =
            caption.trim();

        if (!caption) {
            return message.reply(
                "Caption cannot be empty."
            );
        }

        if (caption.length > 500) {
            return message.reply(
                "Caption is too long. Maximum is 500 characters."
            );
        }

        /*
         * Find the image/GIF.
         *
         * Priority:
         * 1. Attachment on command message
         * 2. Attachment on replied-to message
         */

        let attachment =
            getOwnAttachment(message);

        if (!attachment) {
            attachment =
                await fetchReference(
                    message
                );
        }

        if (!attachment) {
            return message.reply(
                "Reply to an image or GIF, or attach one to the command."
            );
        }

        /*
         * Reject unsupported media.
         */

        const filename =
            attachment.name ||
            attachment.url ||
            "";

        const extension =
            (
                filename
                    .split("?")[0]
                    .split(".")
                    .pop() ||
                ""
            ).toLowerCase();

        const supported =
            [
                "png",
                "jpg",
                "jpeg",
                "gif",
                "webp",
                "avif"
            ].includes(extension);

        if (!supported) {
            return message.reply(
                "That file type is not supported. Use PNG, JPG, GIF, WebP, or AVIF."
            );
        }

        activeJobs.add(userId);

        try {
            await message.channel.sendTyping();

            /*
             * Download source.
             */

            const input =
                await downloadBuffer(
                    attachment.url
                );

            if (
                input.length >
                MAX_FILE_SIZE
            ) {
                throw new Error(
                    "The image is larger than 25 MB."
                );
            }

            /*
             * Determine whether animated.
             */

            const metadata =
                await sharp(input, {
                    animated:
                        extension === "gif",
                    limitInputPixels:
                        MAX_PIXELS
                }).metadata();

            const isGif =
                extension === "gif" &&
                (metadata.pages || 1) > 1;

            let output;
            let outputName;

            if (isGif) {
                output =
                    await renderGif(
                        input,
                        caption
                    );

                outputName =
                    "caption.gif";
            } else {
                output =
                    await renderStatic(
                        input,
                        caption
                    );

                outputName =
                    "caption.png";
            }

            if (
                output.length >
                MAX_FILE_SIZE
            ) {
                throw new Error(
                    "The resulting image is larger than 25 MB."
                );
            }

            const file =
                new AttachmentBuilder(
                    output,
                    {
                        name:
                            outputName
                    }
                );

            await message.reply({
                files: [file]
            });
        } catch (error) {
            console.error(
                "CAPTION ERROR:",
                error
            );

            let errorMessage =
                "Couldn't create the caption.";

            if (
                error.message
                    ?.toLowerCase()
                    .includes("emoji")
            ) {
                errorMessage =
                    "Couldn't load one of the emojis. Please try again.";
            } else if (
                error.message
                    ?.toLowerCase()
                    .includes("too large")
            ) {
                errorMessage =
                    error.message;
            }

            await message.reply(
                errorMessage
            ).catch(() => {});
        } finally {
            activeJobs.delete(userId);
        }
    }
};