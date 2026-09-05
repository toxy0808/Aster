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
const emojiCache = new Map();

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

        const client =
            parsed.protocol === "https:" ? https : http;

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

                    const next = new URL(
                        res.headers.location,
                        parsed
                    ).toString();

                    return downloadBuffer(
                        next,
                        redirects + 1
                    )
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
   FIND MEDIA
========================================================= */

function isSupportedImage(name) {
    return /\.(png|jpe?g|gif|webp|avif)$/i.test(
        name || ""
    );
}

function getOwnAttachment(message) {
    return (
        message.attachments.find(
            attachment =>
                isSupportedImage(
                    attachment.name ||
                    attachment.url
                )
        ) || null
    );
}

function getCachedReference(message) {
    if (!message.reference?.messageId) {
        return null;
    }

    const referenced =
        message.channel.messages.cache.get(
            message.reference.messageId
        );

    if (!referenced) {
        return null;
    }

    return (
        referenced.attachments.find(
            attachment =>
                isSupportedImage(
                    attachment.name ||
                    attachment.url
                )
        ) || null
    );
}

async function getReferencedAttachment(message) {
    const cached =
        getCachedReference(message);

    if (cached) {
        return cached;
    }

    if (!message.reference?.messageId) {
        return null;
    }

    try {
        const referenced =
            await message.channel.messages.fetch(
                message.reference.messageId
            );

        return (
            referenced.attachments.find(
                attachment =>
                    isSupportedImage(
                        attachment.name ||
                        attachment.url
                    )
            ) || null
        );
    } catch {
        return null;
    }
}

/* =========================================================
   EMOJI
========================================================= */

const segmenter = new Intl.Segmenter(undefined, {
    granularity: "grapheme"
});

function isEmojiCluster(value) {
    if (!value) return false;

    if (
        /\p{Extended_Pictographic}/u.test(value)
    ) {
        return true;
    }

    if (
        /^\p{Regional_Indicator}{2}$/u.test(value)
    ) {
        return true;
    }

    if (
        /^[0-9#*]\uFE0F?\u20E3$/u.test(value)
    ) {
        return true;
    }

    return false;
}

function splitGraphemes(text) {
    return [...segmenter.segment(text)].map(
        item => item.segment
    );
}

function splitCaption(text) {
    const parts = [];

    for (const segment of splitGraphemes(text)) {
        parts.push({
            type: isEmojiCluster(segment)
                ? "emoji"
                : "text",
            value: segment
        });
    }

    return parts;
}

async function getEmojiSvg(emoji) {
    if (emojiCache.has(emoji)) {
        return emojiCache.get(emoji);
    }

    const codePoint =
        twemoji.convert.toCodePoint(emoji);

    const url =
        `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoint}.svg`;

    const promise = downloadBuffer(url);

    emojiCache.set(emoji, promise);

    try {
        return await promise;
    } catch (error) {
        emojiCache.delete(emoji);
        throw new Error(
            `Couldn't load emoji: ${emoji}`
        );
    }
}

/* =========================================================
   XML
========================================================= */

function escapeXml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/* =========================================================
   TEXT SETTINGS
========================================================= */

function getFontSize(width, text) {
    const length = [...text].length;

    if (length <= 8) {
        return Math.min(96, Math.round(width * 0.090));
    }

    if (length <= 14) {
        return Math.min(82, Math.round(width * 0.078));
    }

    if (length <= 22) {
        return Math.min(70, Math.round(width * 0.068));
    }

    if (length <= 32) {
        return Math.min(60, Math.round(width * 0.058));
    }

    if (length <= 45) {
        return Math.min(52, Math.round(width * 0.050));
    }

    if (length <= 60) {
        return Math.min(45, Math.round(width * 0.043));
    }

    if (length <= 80) {
        return Math.min(39, Math.round(width * 0.037));
    }

    if (length <= 110) {
        return Math.min(34, Math.round(width * 0.032));
    }

    return 30;
}

function getTextFont() {
    return "Arial, Helvetica, sans-serif";
}

/* =========================================================
   TEXT MEASUREMENT
========================================================= */

function estimateTextWidth(text, fontSize) {
    let width = 0;

    for (const char of [...text]) {
        if (char === " ") {
            width += fontSize * 0.28;
        } else if (/[ilI.,'!:;|]/.test(char)) {
            width += fontSize * 0.27;
        } else if (/[MW@#%&]/.test(char)) {
            width += fontSize * 0.78;
        } else if (/[A-Z]/.test(char)) {
            width += fontSize * 0.63;
        } else {
            width += fontSize * 0.54;
        }
    }

    return width;
}

/*
 * Emoji gets its own visual width plus left/right
 * breathing room. This prevents it touching text.
 */

function getEmojiMetrics(fontSize) {
    const size = Math.round(
        fontSize * 0.88
    );

    const gap = Math.max(
        4,
        Math.round(fontSize * 0.13)
    );

    return {
        size,
        gap,
        width: size + gap * 2
    };
}

function estimatePartWidth(part, fontSize) {
    if (part.type === "emoji") {
        return getEmojiMetrics(fontSize).width;
    }

    return estimateTextWidth(
        part.value,
        fontSize
    );
}

/* =========================================================
   WORD WRAPPING
========================================================= */

function wrapCaption(parts, maxWidth, fontSize) {
    const lines = [];
    let current = [];
    let currentWidth = 0;

    for (const part of parts) {
        const width =
            estimatePartWidth(
                part,
                fontSize
            );

        if (
            current.length > 0 &&
            currentWidth + width > maxWidth
        ) {
            lines.push(current);
            current = [];
            currentWidth = 0;
        }

        current.push(part);
        currentWidth += width;
    }

    if (current.length) {
        lines.push(current);
    }

    return lines;
}

/* =========================================================
   BUILD SVG LINE
========================================================= */

function buildLineSvg(
    line,
    width,
    fontSize,
    y,
    emojiIndexRef,
    emojiImages
) {
    const parts = [];

    let textBuffer = "";

    const flushText = () => {
        if (!textBuffer) {
            return;
        }

        parts.push({
            type: "text",
            value: textBuffer
        });

        textBuffer = "";
    };

    for (const part of line) {
        if (part.type === "emoji") {
            flushText();
            parts.push(part);
        } else {
            textBuffer += part.value;
        }
    }

    flushText();

    /*
     * Calculate exact visual width using the same
     * emoji spacing that will be used when rendering.
     */

    let totalWidth = 0;

    for (const part of parts) {
        totalWidth +=
            estimatePartWidth(
                part,
                fontSize
            );
    }

    let x =
        (width - totalWidth) / 2;

    const elements = [];

    for (const part of parts) {
        if (part.type === "emoji") {
            const emoji =
                emojiImages[
                    emojiIndexRef.value
                ];

            emojiIndexRef.value++;

            const metrics =
                getEmojiMetrics(fontSize);

            /*
             * Left side bearing.
             */

            x += metrics.gap;

            const base64 =
                emoji.toString("base64");

            /*
             * Slightly smaller than the text and
             * vertically aligned to the text baseline.
             */

            const emojiY =
                y -
                metrics.size * 0.82;

            elements.push(`
                <image
                    href="data:image/svg+xml;base64,${base64}"
                    x="${x}"
                    y="${emojiY}"
                    width="${metrics.size}"
                    height="${metrics.size}"
                    preserveAspectRatio="xMidYMid meet"
                />
            `);

            /*
             * Emoji itself + right side bearing.
             */

            x +=
                metrics.size +
                metrics.gap;

            continue;
        }

        const safe =
            escapeXml(part.value);

        const textWidth =
            estimateTextWidth(
                part.value,
                fontSize
            );

        elements.push(`
            <text
                x="${x}"
                y="${y}"
                font-family="${getTextFont()}"
                font-size="${fontSize}px"
                font-weight="700"
                fill="#111111"
                dominant-baseline="alphabetic"
            >${safe}</text>
        `);

        x += textWidth;
    }

    return elements.join("\n");
}

/* =========================================================
   CAPTION BOX
========================================================= */

async function createCaptionSvg(
    width,
    caption
) {
    let finalFontSize =
        getFontSize(
            width,
            caption
        );

    const parts =
        splitCaption(caption);

    let paddingX;
    let maxWidth;
    let lines;

    /*
     * Recalculate wrapping and padding every time
     * the font size changes.
     */

    for (let attempt = 0; attempt < 6; attempt++) {
        paddingX =
            Math.max(
                28,
                Math.round(
                    finalFontSize * 0.70
                )
            );

        maxWidth =
            width -
            paddingX * 2;

        lines =
            wrapCaption(
                parts,
                maxWidth,
                finalFontSize
            );

        let widest = 0;

        for (const line of lines) {
            let lineWidth = 0;

            for (const part of line) {
                lineWidth +=
                    estimatePartWidth(
                        part,
                        finalFontSize
                    );
            }

            widest =
                Math.max(
                    widest,
                    lineWidth
                );
        }

        if (widest <= maxWidth) {
            break;
        }

        finalFontSize =
            Math.max(
                26,
                Math.floor(
                    finalFontSize * 0.92
                )
            );
    }

    const lineHeight =
        Math.round(
            finalFontSize * 1.20
        );

    const verticalPadding =
        lines.length === 1
            ? Math.round(
                finalFontSize * 0.55
            )
            : Math.round(
                finalFontSize * 0.48
            );

    const height =
        verticalPadding * 2 +
        lineHeight * lines.length;

    /*
     * Download emoji graphics.
     */

    const emojiImages = [];

    for (const line of lines) {
        for (const part of line) {
            if (part.type !== "emoji") {
                continue;
            }

            emojiImages.push(
                await getEmojiSvg(
                    part.value
                )
            );
        }
    }

    const emojiIndexRef = {
        value: 0
    };

    const lineElements = [];

    for (
        let i = 0;
        i < lines.length;
        i++
    ) {
        const y =
            verticalPadding +
            finalFontSize +
            i * lineHeight;

        lineElements.push(
            buildLineSvg(
                lines[i],
                width,
                finalFontSize,
                y,
                emojiIndexRef,
                emojiImages
            )
        );
    }

    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="${width}"
            height="${height}"
            viewBox="0 0 ${width} ${height}"
        >
            <rect
                width="${width}"
                height="${height}"
                fill="#ffffff"
            />

            ${lineElements.join("\n")}
        </svg>
    `;

    return {
        svg: Buffer.from(svg),
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
            limitInputPixels:
                MAX_PIXELS
        });

    const metadata =
        await image.metadata();

    if (
        !metadata.width ||
        !metadata.height
    ) {
        throw new Error(
            "Could not determine image dimensions."
        );
    }

    const captionLayer =
        await createCaptionSvg(
            metadata.width,
            caption
        );

    const imageBuffer =
        await image
            .ensureAlpha()
            .toBuffer();

    return sharp({
        create: {
            width:
                metadata.width,
            height:
                captionLayer.height +
                metadata.height,
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
                input:
                    captionLayer.svg,
                left: 0,
                top: 0
            },
            {
                input: imageBuffer,
                left: 0,
                top:
                    captionLayer.height
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
            limitInputPixels:
                MAX_PIXELS
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
        !frameHeight
    ) {
        throw new Error(
            "Could not read GIF dimensions."
        );
    }

    let delays =
        metadata.delay;

    if (!Array.isArray(delays)) {
        delays =
            Array(frameCount).fill(
                typeof delays === "number"
                    ? delays
                    : 100
            );
    }

    if (
        delays.length !==
        frameCount
    ) {
        delays =
            Array(frameCount).fill(
                delays[0] || 100
            );
    }

    const loop =
        typeof metadata.loop === "number"
            ? metadata.loop
            : 0;

    const captionLayer =
        await createCaptionSvg(
            width,
            caption
        );

    const captionBuffer =
        await sharp(
            captionLayer.svg
        )
            .png()
            .toBuffer();

    const rawFrames =
        await sharp(input, {
            animated: true,
            limitInputPixels:
                MAX_PIXELS
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
            rawFrames.subarray(
                i * frameSize,
                (i + 1) * frameSize
            );

        const rendered =
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
                        input:
                            captionBuffer,
                        left: 0,
                        top: 0
                    },
                    {
                        input: frame,
                        raw: {
                            width,
                            height:
                                frameHeight,
                            channels: 4
                        },
                        left: 0,
                        top:
                            captionLayer.height
                    }
                ])
                .raw()
                .toBuffer();

        outputFrames.push(rendered);
    }

    const combined =
        Buffer.concat(
            outputFrames
        );

    return sharp(
        combined,
        {
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
        }
    )
        .gif({
            reuse: true,
            delay: delays,
            loop,
            keepDuplicateFrames: true,
            effort: 3,
            colours: 256
        })
        .toBuffer();
}

/* =========================================================
   COMMAND
========================================================= */

module.exports = {
    name: "caption",
    aliases: ["cap"],

    description:
        "Add a white caption to an image or GIF.",

    async execute(message) {
        const userId =
            message.author.id;

        if (activeJobs.has(userId)) {
            return message.reply(
                "You already have a caption job running."
            );
        }

        /*
         * Read the complete message because the normal
         * dispatcher splits arguments on spaces.
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
         * First check an attachment on the command.
         */

        let attachment =
            getOwnAttachment(message);

        /*
         * Otherwise use the replied-to message.
         */

        if (!attachment) {
            attachment =
                await getReferencedAttachment(
                    message
                );
        }

        if (!attachment) {
            return message.reply(
                "Reply to an image or GIF, or attach one to the command."
            );
        }

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

        if (
            ![
                "png",
                "jpg",
                "jpeg",
                "gif",
                "webp",
                "avif"
            ].includes(extension)
        ) {
            return message.reply(
                "That file type is not supported. Use PNG, JPG, GIF, WebP, or AVIF."
            );
        }

        activeJobs.add(userId);

        try {
            await message.channel.sendTyping();

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

            const metadata =
                await sharp(input, {
                    animated:
                        extension === "gif",
                    limitInputPixels:
                        MAX_PIXELS
                }).metadata();

            const isAnimatedGif =
                extension === "gif" &&
                (metadata.pages || 1) > 1;

            let output;
            let outputName;

            if (isAnimatedGif) {
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
                    .includes("timed out")
            ) {
                errorMessage =
                    "The image took too long to download.";
            } else if (
                error.message
                    ?.toLowerCase()
                    .includes("too large")
            ) {
                errorMessage =
                    error.message;
            } else if (
                error.message
                    ?.toLowerCase()
                    .includes("emoji")
            ) {
                errorMessage =
                    "Couldn't load one of the emojis. Please try again.";
            }

            await message
                .reply(errorMessage)
                .catch(() => {});
        } finally {
            activeJobs.delete(userId);
        }
    }
};