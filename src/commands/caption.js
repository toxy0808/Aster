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

        const client =
            parsed.protocol === "https:"
                ? https
                : http;

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

                    return downloadBuffer(
                        nextUrl,
                        redirects + 1
                    )
                        .then(resolve)
                        .catch(reject);
                }

                if (res.statusCode !== 200) {
                    res.resume();

                    return reject(
                        new Error(
                            `HTTP ${res.statusCode}`
                        )
                    );
                }

                const chunks = [];
                let total = 0;

                res.on("data", chunk => {
                    total += chunk.length;

                    if (total > MAX_FILE_SIZE) {
                        req.destroy();

                        reject(
                            new Error(
                                "File is too large."
                            )
                        );

                        return;
                    }

                    chunks.push(chunk);
                });

                res.on("end", () => {
                    resolve(
                        Buffer.concat(chunks)
                    );
                });

                res.on("error", reject);
            }
        );

        req.setTimeout(
            DOWNLOAD_TIMEOUT,
            () => {
                req.destroy(
                    new Error(
                        "Download timed out."
                    )
                );
            }
        );

        req.on("error", reject);
    });
}

/* =========================================================
   FIND IMAGE / GIF
========================================================= */

function getReferencedAttachment(message) {
    if (!message.reference?.messageId) {
        return null;
    }

    const referencedMessage =
        message.channel.messages.cache.get(
            message.reference.messageId
        );

    if (!referencedMessage) {
        return null;
    }

    return (
        referencedMessage.attachments.find(
            attachment =>
                /\.(png|jpe?g|gif|webp|avif)$/i.test(
                    attachment.name ||
                    attachment.url
                )
        ) || null
    );
}

async function fetchReference(message) {
    const cached =
        getReferencedAttachment(message);

    if (cached) {
        return cached;
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
                attachment =>
                    /\.(png|jpe?g|gif|webp|avif)$/i.test(
                        attachment.name ||
                        attachment.url
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
            attachment =>
                /\.(png|jpe?g|gif|webp|avif)$/i.test(
                    attachment.name ||
                    attachment.url
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
    if (!text) {
        return false;
    }

    // Normal emoji, emoji modifiers and ZWJ emoji
    if (/\p{Extended_Pictographic}/u.test(text)) {
        return true;
    }

    // Country flags
    if (/^\p{Regional_Indicator}{2}$/u.test(text)) {
        return true;
    }

    // Keycap emoji
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
   TWEMOJI
========================================================= */

async function getEmojiSvg(emoji) {
    const codePoint =
        twemoji.convert.toCodePoint(
            emoji
        );

    const url =
        `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoint}.svg`;

    return downloadBuffer(url);
}

/* =========================================================
   XML
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
   FONT SIZE
========================================================= */

function calculateFontSize(width, text) {
    const length = [...text].length;

    if (length <= 10) {
        return Math.min(
            100,
            Math.round(width * 0.095)
        );
    }

    if (length <= 18) {
        return Math.min(
            86,
            Math.round(width * 0.082)
        );
    }

    if (length <= 30) {
        return Math.min(
            72,
            Math.round(width * 0.070)
        );
    }

    if (length <= 45) {
        return Math.min(
            60,
            Math.round(width * 0.060)
        );
    }

    if (length <= 65) {
        return Math.min(
            50,
            Math.round(width * 0.050)
        );
    }

    if (length <= 90) {
        return Math.min(
            42,
            Math.round(width * 0.043)
        );
    }

    return Math.min(
        36,
        Math.round(width * 0.036)
    );
}

/* =========================================================
   CHARACTER WIDTH
========================================================= */

function getCharacterWidth(char, fontSize) {
    if (/[ilI.,'!:;|]/.test(char)) {
        return fontSize * 0.25;
    }

    if (/[MW@#%&]/.test(char)) {
        return fontSize * 0.78;
    }

    if (/[fjrt]/.test(char)) {
        return fontSize * 0.38;
    }

    if (/[m]/.test(char)) {
        return fontSize * 0.72;
    }

    if (/[w]/.test(char)) {
        return fontSize * 0.67;
    }

    if (/[A-Z]/.test(char)) {
        return fontSize * 0.60;
    }

    return fontSize * 0.52;
}

/* =========================================================
   CAPTION SVG
========================================================= */

async function createCaptionSvg(
    width,
    caption,
    fontSize
) {
    const parts =
        splitCaption(caption);

    const paddingX =
        Math.round(fontSize * 0.70);

    const paddingY =
        Math.round(fontSize * 0.55);

    const maxWidth =
        width - paddingX * 2;

    /*
     * Extra spacing between characters.
     */
    const letterSpacing =
        Math.max(
            0.5,
            Math.round(
                fontSize * 0.012 * 10
            ) / 10
        );

    /*
     * Break the caption into lines based on
     * actual estimated character widths.
     */
    const lines = [];

    let currentLine = [];
    let currentWidth = 0;

    for (const part of parts) {
        let partWidth = 0;

        if (part.type === "emoji") {
            partWidth =
                fontSize +
                letterSpacing;
        } else {
            const chars =
                [...part.value];

            for (const char of chars) {
                partWidth +=
                    getCharacterWidth(
                        char,
                        fontSize
                    );

                partWidth +=
                    letterSpacing;
            }
        }

        if (
            currentLine.length > 0 &&
            currentWidth + partWidth >
                maxWidth
        ) {
            lines.push(currentLine);

            currentLine = [];
            currentWidth = 0;
        }

        currentLine.push(part);
        currentWidth += partWidth;
    }

    if (currentLine.length > 0) {
        lines.push(currentLine);
    }

    /*
     * Comfortable vertical spacing.
     */
    const lineHeight =
        Math.round(
            fontSize * 1.30
        );

    const height =
        paddingY * 2 +
        lines.length * lineHeight;

    /*
     * Download every emoji once.
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
                svg
            });
        }
    }

    let emojiIndex = 0;

    const elements = [];

    for (
        let lineIndex = 0;
        lineIndex < lines.length;
        lineIndex++
    ) {
        const line =
            lines[lineIndex];

        /*
         * Calculate exact rendered width.
         */
        let lineWidth = 0;

        for (const part of line) {
            if (part.type === "emoji") {
                lineWidth +=
                    fontSize +
                    letterSpacing;
            } else {
                for (
                    const char of [
                        ...part.value
                    ]
                ) {
                    lineWidth +=
                        getCharacterWidth(
                            char,
                            fontSize
                        );

                    lineWidth +=
                        letterSpacing;
                }
            }
        }

        /*
         * Center the complete line.
         */
        let x =
            (width - lineWidth) / 2;

        const y =
            paddingY +
            lineIndex * lineHeight +
            fontSize;

        for (const part of line) {
            if (part.type === "emoji") {
                const emoji =
                    emojiImages[
                        emojiIndex++
                    ];

                const base64 =
                    emoji.svg.toString(
                        "base64"
                    );

                const emojiY =
                    y -
                    fontSize * 0.91;

                elements.push(`
                    <image
                        href="data:image/svg+xml;base64,${base64}"
                        x="${x}"
                        y="${emojiY}"
                        width="${fontSize}"
                        height="${fontSize}"
                    />
                `);

                /*
                 * Small gap after emoji.
                 */
                x +=
                    fontSize +
                    letterSpacing * 0.45;

                continue;
            }

            /*
             * Render each character individually.
             *
             * This prevents characters from colliding
             * and lets narrow/wide letters have different
             * spacing.
             */
            for (
                const char of [
                    ...part.value
                ]
            ) {
                const safeChar =
                    escapeXml(char);

                elements.push(`
                    <text
                        x="${x}"
                        y="${y}"
                        font-family="Arial, Helvetica, sans-serif"
                        font-size="${fontSize}px"
                        font-weight="700"
                        fill="#111111"
                    >${safeChar}</text>
                `);

                x +=
                    getCharacterWidth(
                        char,
                        fontSize
                    );

                x +=
                    letterSpacing;
            }
        }
    }

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
                    fill="#ffffff"
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
            limitInputPixels:
                MAX_PIXELS
        });

    const metadata =
        await image.metadata();

    const width =
        metadata.width;

    const originalHeight =
        metadata.height;

    if (
        !width ||
        !originalHeight
    ) {
        throw new Error(
            "Could not determine image dimensions."
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

    const imageBuffer =
        await image
            .ensureAlpha()
            .toBuffer();

    return sharp({
        create: {
            width,
            height:
                captionLayer.height +
                originalHeight,
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
                left: 0,
                top: 0
            },
            {
                input: imageBuffer,
                left: 0,
                top: captionLayer.height
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
        !frameHeight ||
        !frameCount
    ) {
        throw new Error(
            "Could not read GIF dimensions."
        );
    }

    /*
     * Preserve original GIF timing.
     */
    let delays =
        metadata.delay;

    if (!Array.isArray(delays)) {
        delays = Array(
            frameCount
        ).fill(
            typeof delays === "number"
                ? delays
                : 100
        );
    }

    if (
        delays.length !==
        frameCount
    ) {
        delays = Array(
            frameCount
        ).fill(
            delays[0] || 100
        );
    }

    /*
     * Preserve loop count.
     */
    const loop =
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

    const captionBuffer =
        await sharp(
            captionLayer.svg
        )
            .png()
            .toBuffer();

    /*
     * Decode every GIF frame.
     */
    const frameData =
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
            frameData.subarray(
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
                        left: 0,
                        top: 0
                    },
                    {
                        input: frame,
                        raw: {
                            width,
                            height: frameHeight,
                            channels: 4
                        },
                        left: 0,
                        top:
                            captionLayer.height
                    }
                ])
                .raw()
                .toBuffer();

        outputFrames.push(output);
    }

    /*
     * Reassemble the animated GIF.
     */
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
         * Read message.content directly because
         * the normal command dispatcher splits args
         * and destroys quoted spaces.
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
         * Find attached image first.
         */
        let attachment =
            getOwnAttachment(message);

        /*
         * Otherwise use replied-to message.
         */
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
            ].includes(
                extension
            );

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
             * Check dimensions.
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