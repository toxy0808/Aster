const { AttachmentBuilder } = require("discord.js");
const sharp = require("sharp");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const MAX_CAPTION_LENGTH = 2000;
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_PIXELS = 100_000_000;

const activeUsers = new Set();

/*
 * ------------------------------------------------------------
 * CAPTION PARSER
 * ------------------------------------------------------------
 */

function parseCaption(message) {
    const content = message.content || "";

    // Remove the command itself.
    const match = content.match(/^\s*\S+\s+([\s\S]+?)\s*$/);

    if (!match) {
        return null;
    }

    let caption = match[1];

    // Remove matching quotes.
    if (
        caption.length >= 2 &&
        (
            (caption.startsWith('"') && caption.endsWith('"')) ||
            (caption.startsWith("'") && caption.endsWith("'"))
        )
    ) {
        caption = caption.slice(1, -1);
    }

    caption = caption.trim();

    if (!caption.length) {
        return null;
    }

    if (caption.length > MAX_CAPTION_LENGTH) {
        return null;
    }

    return caption;
}

/*
 * ------------------------------------------------------------
 * SVG ESCAPING
 * ------------------------------------------------------------
 */

function escapeXml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/*
 * ------------------------------------------------------------
 * TEXT WRAPPING
 * ------------------------------------------------------------
 */

function wrapText(text, maxChars) {
    const paragraphs = text.split(/\r?\n/);
    const lines = [];

    for (const paragraph of paragraphs) {
        if (!paragraph.length) {
            lines.push("");
            continue;
        }

        let remaining = paragraph;

        while (remaining.length > maxChars) {
            let breakAt = remaining.lastIndexOf(" ", maxChars);

            // Long word with no spaces.
            if (breakAt <= 0) {
                breakAt = maxChars;
            }

            lines.push(
                remaining.slice(0, breakAt).trimEnd()
            );

            remaining = remaining
                .slice(breakAt)
                .replace(/^ +/, "");
        }

        lines.push(remaining);
    }

    return lines;
}

/*
 * ------------------------------------------------------------
 * FONT SIZE
 *
 * Short text  -> BIG
 * Long text   -> SMALLER
 * ------------------------------------------------------------
 */

function calculateFontSize(width, caption) {
    const length = caption.length;

    // Base size scales with image width.
    const base = Math.round(width * 0.065);

    // Keep it in a nice meme-caption range.
    let size = Math.max(38, Math.min(76, base));

    // Longer captions get progressively smaller.
    if (length > 35) {
        size = Math.min(size, 68);
    }

    if (length > 60) {
        size = Math.min(size, 60);
    }

    if (length > 90) {
        size = Math.min(size, 52);
    }

    if (length > 130) {
        size = Math.min(size, 46);
    }

    if (length > 180) {
        size = Math.min(size, 40);
    }

    return size;
}

/*
 * ------------------------------------------------------------
 * CAPTION BOX
 *
 * Clean centered white meme caption.
 * ------------------------------------------------------------
 */

function buildCaptionSvg(width, imageHeight, caption) {
    let fontSize = calculateFontSize(
        width,
        caption
    );

    const horizontalPadding =
        Math.max(32, Math.round(width * 0.055));

    const verticalPadding =
        Math.max(26, Math.round(fontSize * 0.55));

    /*
     * Estimate characters per line.
     *
     * Arial is approximately 0.5-0.55em per character.
     */
    let maxChars = Math.floor(
        (width - horizontalPadding * 2) /
        (fontSize * 0.52)
    );

    maxChars = Math.max(10, maxChars);

    let lines = wrapText(
        caption,
        maxChars
    );

    /*
     * If there are too many lines, reduce font size.
     */
    while (
        lines.length > 5 &&
        fontSize > 30
    ) {
        fontSize -= 2;

        maxChars = Math.floor(
            (width - horizontalPadding * 2) /
            (fontSize * 0.52)
        );

        maxChars = Math.max(10, maxChars);

        lines = wrapText(
            caption,
            maxChars
        );
    }

    /*
     * Larger line spacing gives the modern meme look.
     */
    const lineHeight =
        Math.round(fontSize * 1.18);

    /*
     * The white box gets its height from the text.
     */
    const captionHeight =
        verticalPadding * 2 +
        lineHeight * lines.length;

    /*
     * SVG text-anchor="middle" means the text is
     * horizontally centered.
     */
    const centerX = width / 2;

    /*
     * Calculate the entire text block height and
     * center it vertically.
     */
    const textBlockHeight =
        lineHeight * lines.length;

    const firstBaseline =
        (captionHeight - textBlockHeight) / 2 +
        fontSize;

    const textElements = lines
        .map((line, index) => {
            return `
                <text
                    x="${centerX}"
                    y="${firstBaseline + index * lineHeight}"
                    text-anchor="middle"
                    font-family="Arial, Helvetica, sans-serif"
                    font-size="${fontSize}px"
                    font-weight="700"
                    fill="#000000"
                    dominant-baseline="alphabetic"
                    xml:space="preserve"
                >${escapeXml(line)}</text>
            `;
        })
        .join("");

    const svg = `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="${width}"
            height="${captionHeight}"
            viewBox="0 0 ${width} ${captionHeight}"
        >
            <rect
                x="0"
                y="0"
                width="${width}"
                height="${captionHeight}"
                fill="white"
            />

            ${textElements}
        </svg>
    `;

    return {
        svg: Buffer.from(svg),
        captionHeight
    };
}

/*
 * ------------------------------------------------------------
 * DOWNLOAD
 * ------------------------------------------------------------
 */

function downloadBuffer(urlString, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        if (redirectCount > 5) {
            return reject(
                new Error("Too many redirects.")
            );
        }

        let parsed;

        try {
            parsed = new URL(urlString);
        } catch {
            return reject(
                new Error("Invalid media URL.")
            );
        }

        if (
            parsed.protocol !== "http:" &&
            parsed.protocol !== "https:"
        ) {
            return reject(
                new Error("Unsupported media URL.")
            );
        }

        const transport =
            parsed.protocol === "https:"
                ? https
                : http;

        const request = transport.get(
            parsed,
            {
                headers: {
                    "User-Agent":
                        "ASTER Discord Bot"
                }
            },
            response => {
                /*
                 * Handle redirects.
                 */
                if (
                    response.statusCode >= 300 &&
                    response.statusCode < 400 &&
                    response.headers.location
                ) {
                    response.resume();

                    const nextUrl =
                        new URL(
                            response.headers.location,
                            parsed
                        ).toString();

                    return downloadBuffer(
                        nextUrl,
                        redirectCount + 1
                    )
                        .then(resolve)
                        .catch(reject);
                }

                if (response.statusCode !== 200) {
                    response.resume();

                    return reject(
                        new Error(
                            `Media returned HTTP ${response.statusCode}.`
                        )
                    );
                }

                let total = 0;
                const chunks = [];

                response.on("data", chunk => {
                    total += chunk.length;

                    if (
                        total >
                        MAX_DOWNLOAD_BYTES
                    ) {
                        request.destroy(
                            new Error(
                                "Media is larger than 25 MB."
                            )
                        );

                        return;
                    }

                    chunks.push(chunk);
                });

                response.on("end", () => {
                    resolve(
                        Buffer.concat(chunks)
                    );
                });

                response.on("error", reject);
            }
        );

        request.setTimeout(
            DOWNLOAD_TIMEOUT_MS,
            () => {
                request.destroy(
                    new Error(
                        "Media download timed out."
                    )
                );
            }
        );

        request.on("error", reject);
    });
}

/*
 * ------------------------------------------------------------
 * FIND REPLIED IMAGE
 * ------------------------------------------------------------
 */

async function getReferencedAttachment(message) {
    if (!message.reference?.messageId) {
        throw new Error(
            "Reply to an image or GIF first."
        );
    }

    let referencedMessage;

    try {
        if (
            typeof message.fetchReference ===
            "function"
        ) {
            referencedMessage =
                await message.fetchReference();
        } else {
            referencedMessage =
                await message.channel.messages.fetch(
                    message.reference.messageId
                );
        }
    } catch {
        throw new Error(
            "I couldn't access the message you replied to."
        );
    }

    const attachments =
        [...referencedMessage.attachments.values()];

    if (!attachments.length) {
        throw new Error(
            "That message doesn't contain an attachment."
        );
    }

    const images =
        attachments.filter(attachment => {
            const type =
                (
                    attachment.contentType ||
                    ""
                ).toLowerCase();

            const name =
                (
                    attachment.name ||
                    ""
                ).toLowerCase();

            return (
                type.startsWith("image/") ||
                /\.(png|jpe?g|gif|webp|avif)$/i.test(
                    name
                )
            );
        });

    if (!images.length) {
        throw new Error(
            "That attachment isn't a supported image or GIF."
        );
    }

    if (images.length > 1) {
        throw new Error(
            "That message has multiple images. Reply to a message with only one image."
        );
    }

    return images[0];
}

/*
 * ------------------------------------------------------------
 * STATIC IMAGE
 * ------------------------------------------------------------
 */

async function renderStatic(
    inputBuffer,
    caption,
    format
) {
    const image =
        sharp(inputBuffer, {
            limitInputPixels:
                MAX_PIXELS
        }).autoOrient();

    const metadata =
        await image.metadata();

    if (
        !metadata.width ||
        !metadata.height
    ) {
        throw new Error(
            "Couldn't read image dimensions."
        );
    }

    const {
        svg,
        captionHeight
    } = buildCaptionSvg(
        metadata.width,
        metadata.height,
        caption
    );

    let pipeline =
        image.extend({
            top: captionHeight,
            bottom: 0,
            left: 0,
            right: 0,
            background: {
                r: 255,
                g: 255,
                b: 255,
                alpha: 1
            }
        });

    pipeline =
        pipeline.composite([
            {
                input: svg,
                top: 0,
                left: 0
            }
        ]);

    switch (format) {
        case "jpeg":
        case "jpg":
            return {
                buffer:
                    await pipeline
                        .jpeg({
                            quality: 95
                        })
                        .toBuffer(),
                extension: "jpg"
            };

        case "webp":
            return {
                buffer:
                    await pipeline
                        .webp({
                            lossless: true
                        })
                        .toBuffer(),
                extension: "webp"
            };

        case "avif":
            return {
                buffer:
                    await pipeline
                        .avif({
                            lossless: true
                        })
                        .toBuffer(),
                extension: "avif"
            };

        case "png":
        default:
            return {
                buffer:
                    await pipeline
                        .png()
                        .toBuffer(),
                extension: "png"
            };
    }
}

/*
 * ------------------------------------------------------------
 * GIF
 *
 * IMPORTANT:
 *
 * We preserve:
 *
 * - every frame
 * - every frame delay
 * - loop count
 * - duplicate frames
 *
 * The GIF itself must be re-encoded because the caption
 * is physically added to every frame.
 * ------------------------------------------------------------
 */

async function renderGif(
    inputBuffer,
    caption
) {
    const metadata =
        await sharp(inputBuffer, {
            animated: true,
            limitInputPixels:
                MAX_PIXELS
        }).metadata();

    const frameCount =
        metadata.pages;

    if (
        !Number.isInteger(frameCount) ||
        frameCount < 1
    ) {
        throw new Error(
            "Invalid GIF."
        );
    }

    /*
     * ORIGINAL frame delays.
     *
     * Example:
     * [100, 100, 500, 100]
     *
     * These are kept exactly.
     */
    const originalDelays =
        Array.isArray(metadata.delay)
            ? [...metadata.delay]
            : [];

    if (
        originalDelays.length !==
        frameCount
    ) {
        throw new Error(
            "Couldn't read the GIF's frame timing."
        );
    }

    /*
     * ORIGINAL loop count.
     *
     * 0 = infinite.
     */
    const originalLoop =
        Number.isInteger(metadata.loop)
            ? metadata.loop
            : 0;

    const frames = [];

    /*
     * Process every frame separately.
     */
    for (
        let i = 0;
        i < frameCount;
        i++
    ) {
        const frame =
            await sharp(
                inputBuffer,
                {
                    animated: true,
                    page: i,
                    limitInputPixels:
                        MAX_PIXELS
                }
            )
                .png()
                .toBuffer();

        const frameMetadata =
            await sharp(frame).metadata();

        if (
            !frameMetadata.width ||
            !frameMetadata.height
        ) {
            throw new Error(
                `Couldn't read GIF frame ${i}.`
            );
        }

        const {
            svg,
            captionHeight
        } = buildCaptionSvg(
            frameMetadata.width,
            frameMetadata.height,
            caption
        );

        const processed =
            await sharp(frame)
                .extend({
                    top: captionHeight,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: {
                        r: 255,
                        g: 255,
                        b: 255,
                        alpha: 1
                    }
                })
                .composite([
                    {
                        input: svg,
                        top: 0,
                        left: 0
                    }
                ])
                .png()
                .toBuffer();

        frames.push(processed);
    }

    const firstMetadata =
        await sharp(frames[0])
            .metadata();

    const width =
        firstMetadata.width;

    const frameHeight =
        firstMetadata.height;

    /*
     * Build one vertical strip containing all frames.
     */
    const strip =
        await sharp({
            create: {
                width,
                height:
                    frameHeight *
                    frameCount,
                channels: 4,
                background: {
                    r: 0,
                    g: 0,
                    b: 0,
                    alpha: 0
                }
            }
        })
            .composite(
                frames.map(
                    (frame, index) => ({
                        input: frame,
                        left: 0,
                        top:
                            index *
                            frameHeight
                    })
                )
            )
            .png()
            .toBuffer();

    /*
     * Re-encode GIF.
     *
     * The ORIGINAL timing array and loop value
     * are explicitly passed back into Sharp.
     */
    const output =
        await sharp(
            strip,
            {
                animated: {
                    pages: frameCount,
                    pageHeight:
                        frameHeight
                },
                limitInputPixels:
                    MAX_PIXELS
            }
        )
            .gif({
                reuse: true,

                /*
                 * Keep original frame delays.
                 */
                delay: originalDelays,

                /*
                 * Keep original loop count.
                 */
                loop: originalLoop,

                /*
                 * Do NOT remove duplicate frames.
                 */
                keepDuplicateFrames: true,

                effort: 3,
                colours: 256
            })
            .toBuffer();

    return {
        buffer: output,
        extension: "gif"
    };
}

/*
 * ------------------------------------------------------------
 * MAIN RENDERER
 * ------------------------------------------------------------
 */

async function renderCaptionedImage(
    inputBuffer,
    caption
) {
    const metadata =
        await sharp(inputBuffer, {
            animated: true,
            limitInputPixels:
                MAX_PIXELS
        }).metadata();

    const format =
        (
            metadata.format ||
            ""
        ).toLowerCase();

    if (format === "gif") {
        return renderGif(
            inputBuffer,
            caption
        );
    }

    if (
        ["png", "jpeg", "jpg", "webp", "avif"]
            .includes(format)
    ) {
        return renderStatic(
            inputBuffer,
            caption,
            format
        );
    }

    throw new Error(
        "Only PNG, JPG, JPEG, WebP, AVIF and GIF are supported."
    );
}

/*
 * ------------------------------------------------------------
 * COMMAND
 * ------------------------------------------------------------
 */

module.exports = {
    name: "caption",

    aliases: [
        "cap"
    ],

    description:
        "Add a white caption to an image or GIF.",

    async execute(message) {
        if (message.author.bot) {
            return;
        }

        const caption =
            parseCaption(message);

        if (!caption) {
            return message.reply({
                content:
                    'Usage: `,caption "your text here"`\n' +
                    "Reply to an image or GIF first.",
                allowedMentions: {
                    repliedUser: false
                }
            });
        }

        /*
         * Don't let the same user start several
         * expensive image jobs at once.
         */
        if (
            activeUsers.has(
                message.author.id
            )
        ) {
            return message.reply({
                content:
                    "You already have a caption running.",
                allowedMentions: {
                    repliedUser: false
                }
            });
        }

        activeUsers.add(
            message.author.id
        );

        try {
            const attachment =
                await getReferencedAttachment(
                    message
                );

            if (
                attachment.size &&
                attachment.size >
                    MAX_DOWNLOAD_BYTES
            ) {
                throw new Error(
                    "That file is larger than 25 MB."
                );
            }

            const input =
                await downloadBuffer(
                    attachment.url
                );

            const result =
                await renderCaptionedImage(
                    input,
                    caption
                );

            const filename =
                `captioned-${Date.now()}.${result.extension}`;

            const output =
                new AttachmentBuilder(
                    result.buffer,
                    {
                        name: filename
                    }
                );

            await message.reply({
                files: [output],
                allowedMentions: {
                    repliedUser: false
                }
            });
        } catch (error) {
            console.error(
                "[caption]",
                error
            );

            await message.reply({
                content:
                    `❌ ${
                        error instanceof Error
                            ? error.message
                            : "Something went wrong."
                    }`,
                allowedMentions: {
                    repliedUser: false
                }
            }).catch(() => {});
        } finally {
            activeUsers.delete(
                message.author.id
            );
        }
    }
};