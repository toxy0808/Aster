const {
    AttachmentBuilder
} = require("discord.js");

const sharp = require("sharp");

module.exports = {
    name: "caption",
    aliases: ["cap"],

    async execute(message, args) {
        // ========================================================
        // CONFIG
        // ========================================================

        const MAX_CAPTION_LENGTH = 1000;
        const MAX_DOWNLOAD_SIZE = 25 * 1024 * 1024; // 25 MB
        const MAX_OUTPUT_WIDTH = 4096;

        // ========================================================
        // HELPERS
        // ========================================================

        function error(text) {
            return message.reply(text);
        }

        function getCaption(rawArgs) {
            const input = rawArgs.join(" ").trim();

            if (!input) {
                return null;
            }

            // Preferred syntax:
            // ,caption "hello world"
            //
            // Also accept:
            // ,caption hello world

            const quoted = input.match(
                /^["“](.*)["”]$/s
            );

            if (quoted) {
                return quoted[1].trim();
            }

            return input;
        }

        function isImageAttachment(attachment) {
            if (!attachment) {
                return false;
            }

            const contentType =
                attachment.contentType?.toLowerCase() || "";

            const name =
                attachment.name?.toLowerCase() || "";

            const url =
                attachment.url?.toLowerCase() || "";

            return (
                contentType.startsWith("image/") ||
                /\.(png|jpe?g|webp|gif|avif)$/i.test(name) ||
                /\.(png|jpe?g|webp|gif|avif)(?:\?|$)/i.test(url)
            );
        }

        function isGif(attachment) {
            if (!attachment) {
                return false;
            }

            const contentType =
                attachment.contentType?.toLowerCase() || "";

            const name =
                attachment.name?.toLowerCase() || "";

            return (
                contentType === "image/gif" ||
                /\.gif$/i.test(name)
            );
        }

        function escapeSvg(text) {
            return String(text)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&apos;");
        }

        function wrapText(text, maxCharacters) {
            const words =
                text
                    .split(/\s+/)
                    .filter(Boolean);

            const lines = [];
            let current = "";

            for (const word of words) {
                // A single extremely long word needs splitting.
                if (word.length > maxCharacters) {
                    if (current) {
                        lines.push(current);
                        current = "";
                    }

                    for (
                        let i = 0;
                        i < word.length;
                        i += maxCharacters
                    ) {
                        lines.push(
                            word.slice(
                                i,
                                i + maxCharacters
                            )
                        );
                    }

                    continue;
                }

                const candidate =
                    current
                        ? `${current} ${word}`
                        : word;

                if (
                    candidate.length <= maxCharacters
                ) {
                    current = candidate;
                } else {
                    if (current) {
                        lines.push(current);
                    }

                    current = word;
                }
            }

            if (current) {
                lines.push(current);
            }

            return lines;
        }

        function createCaptionSvg(
            width,
            height,
            caption
        ) {
            const fontSize =
                Math.max(
                    24,
                    Math.min(
                        56,
                        Math.round(width * 0.035)
                    )
                );

            const horizontalPadding =
                Math.max(
                    24,
                    Math.round(width * 0.055)
                );

            const verticalPadding =
                Math.max(
                    24,
                    Math.round(fontSize * 1.1)
                );

            const maxCharacters =
                Math.max(
                    18,
                    Math.floor(
                        width / (fontSize * 0.58)
                    )
                );

            const paragraphs =
                caption.split(/\r?\n/);

            const lines = [];

            for (const paragraph of paragraphs) {
                if (!paragraph.trim()) {
                    lines.push("");
                    continue;
                }

                lines.push(
                    ...wrapText(
                        paragraph.trim(),
                        maxCharacters
                    )
                );
            }

            const lineHeight =
                Math.round(fontSize * 1.35);

            const textHeight =
                Math.max(
                    lineHeight,
                    lines.length * lineHeight
                );

            const boxHeight =
                textHeight +
                verticalPadding * 2;

            const textX =
                horizontalPadding;

            const firstBaseline =
                verticalPadding +
                fontSize;

            const textElements =
                lines
                    .map((line, index) => {
                        return `
                            <text
                                x="${textX}"
                                y="${firstBaseline + index * lineHeight}"
                                font-family="Arial, Helvetica, sans-serif"
                                font-size="${fontSize}px"
                                font-weight="600"
                                fill="#000000"
                            >${escapeSvg(line)}</text>
                        `;
                    })
                    .join("");

            return {
                svg: `
                    <svg
                        width="${width}"
                        height="${boxHeight}"
                        viewBox="0 0 ${width} ${boxHeight}"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <rect
                            x="0"
                            y="0"
                            width="${width}"
                            height="${boxHeight}"
                            fill="#ffffff"
                        />

                        ${textElements}
                    </svg>
                `,
                height: boxHeight
            };
        }

        async function downloadAttachment(
            attachment
        ) {
            const response =
                await fetch(
                    attachment.url,
                    {
                        headers: {
                            "User-Agent":
                                "ASTER Discord Bot"
                        }
                    }
                );

            if (!response.ok) {
                throw new Error(
                    `Attachment download failed: HTTP ${response.status}`
                );
            }

            const contentLength =
                Number(
                    response.headers.get(
                        "content-length"
                    ) || 0
                );

            if (
                contentLength >
                MAX_DOWNLOAD_SIZE
            ) {
                throw new Error(
                    "Attachment is too large."
                );
            }

            const arrayBuffer =
                await response.arrayBuffer();

            const buffer =
                Buffer.from(arrayBuffer);

            if (
                buffer.length >
                MAX_DOWNLOAD_SIZE
            ) {
                throw new Error(
                    "Attachment is too large."
                );
            }

            return buffer;
        }

        // ========================================================
        // VALIDATE CAPTION
        // ========================================================

        const caption =
            getCaption(args);

        if (!caption) {
            return error(
                "Usage: `,caption \"your caption here\"`\n\n" +
                "Reply to an image or GIF and use the command."
            );
        }

        if (
            caption.length >
            MAX_CAPTION_LENGTH
        ) {
            return error(
                `Your caption is too long. Maximum length is **${MAX_CAPTION_LENGTH} characters**.`
            );
        }

        // ========================================================
        // REQUIRE REPLY
        // ========================================================

        if (!message.reference?.messageId) {
            return error(
                "You need to **reply to an image or GIF** with the caption command."
            );
        }

        // ========================================================
        // FETCH ORIGINAL MESSAGE
        // ========================================================

        let targetMessage;

        try {
            targetMessage =
                await message.channel.messages.fetch(
                    message.reference.messageId
                );
        } catch (err) {
            console.error(
                "CAPTION FETCH ERROR:",
                err
            );

            return error(
                "I couldn't access the message you're replying to."
            );
        }

        if (!targetMessage) {
            return error(
                "I couldn't find the message you're replying to."
            );
        }

        // ========================================================
        // FIND IMAGE / GIF
        // ========================================================

        const attachments =
            [...targetMessage.attachments.values()];

        const imageAttachments =
            attachments.filter(
                isImageAttachment
            );

        if (!imageAttachments.length) {
            return error(
                "The message you're replying to doesn't contain an image or GIF."
            );
        }

        // Avoid silently choosing the wrong attachment.
        if (imageAttachments.length > 1) {
            return error(
                "That message contains multiple images/GIFs. Please reply to a message containing **one** image or GIF."
            );
        }

        const attachment =
            imageAttachments[0];

        // ========================================================
        // DOWNLOAD
        // ========================================================

        let inputBuffer;

        try {
            inputBuffer =
                await downloadAttachment(
                    attachment
                );
        } catch (err) {
            console.error(
                "CAPTION DOWNLOAD ERROR:",
                err
            );

            if (
                err.message ===
                "Attachment is too large."
            ) {
                return error(
                    "That media file is too large for me to process."
                );
            }

            return error(
                "I couldn't download the media from Discord."
            );
        }

        // ========================================================
        // READ IMAGE METADATA
        // ========================================================

        let metadata;

        try {
            metadata =
                await sharp(inputBuffer, {
                    animated: isGif(attachment)
                }).metadata();
        } catch (err) {
            console.error(
                "CAPTION METADATA ERROR:",
                err
            );

            return error(
                "I couldn't read that image."
            );
        }

        const originalWidth =
            metadata.width;

        if (!originalWidth) {
            return error(
                "I couldn't determine the image dimensions."
            );
        }

        const width =
            Math.min(
                originalWidth,
                MAX_OUTPUT_WIDTH
            );

        const isAnimated =
            Boolean(
                isGif(attachment) &&
                metadata.pages &&
                metadata.pages > 1
            );

        // ========================================================
        // BUILD CAPTION
        // ========================================================

        const captionBox =
            createCaptionSvg(
                width,
                metadata.height || width,
                caption
            );

        // ========================================================
        // STATIC IMAGE
        // ========================================================

        if (!isAnimated) {
            try {
                const image =
                    sharp(inputBuffer);

                const resized =
                    originalWidth > width
                        ? image.resize({
                            width,
                            withoutEnlargement: true
                        })
                        : image;

                const resizedMetadata =
                    originalWidth > width
                        ? await resized.metadata()
                        : metadata;

                const imageHeight =
                    resizedMetadata.height ||
                    metadata.height ||
                    width;

                const finalCaption =
                    createCaptionSvg(
                        width,
                        imageHeight,
                        caption
                    );

                const output =
                    await resized
                        .extend({
                            top: finalCaption.height,
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
                                input:
                                    Buffer.from(
                                        finalCaption.svg
                                    ),
                                top: 0,
                                left: 0
                            }
                        ])
                        .png()
                        .toBuffer();

                const filename =
                    `caption-${Date.now()}.png`;

                return message.reply({
                    files: [
                        new AttachmentBuilder(
                            output,
                            {
                                name: filename
                            }
                        )
                    ]
                });
            } catch (err) {
                console.error(
                    "CAPTION IMAGE ERROR:",
                    err
                );

                return error(
                    "Something went wrong while adding the caption."
                );
            }
        }

        // ========================================================
        // ANIMATED GIF
        // ========================================================

        try {
            const animated =
                sharp(inputBuffer, {
                    animated: true
                });

            const animatedMetadata =
                await animated.metadata();

            const gifWidth =
                Math.min(
                    animatedMetadata.width ||
                        width,
                    MAX_OUTPUT_WIDTH
                );

            const gifHeight =
                animatedMetadata.height ||
                width;

            const finalCaption =
                createCaptionSvg(
                    gifWidth,
                    gifHeight,
                    caption
                );

            /*
             * Extend the animated image upward and
             * composite the same caption box onto
             * every frame.
             *
             * Sharp applies the operation to the
             * complete animated image.
             */

            const output =
                await animated
                    .resize({
                        width: gifWidth,
                        withoutEnlargement: true
                    })
                    .extend({
                        top: finalCaption.height,
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
                            input:
                                Buffer.from(
                                    finalCaption.svg
                                ),
                            top: 0,
                            left: 0
                        }
                    ])
                    .gif({
                        effort: 3
                    })
                    .toBuffer();

            const filename =
                `caption-${Date.now()}.gif`;

            return message.reply({
                files: [
                    new AttachmentBuilder(
                        output,
                        {
                            name: filename
                        }
                    )
                ]
            });
        } catch (err) {
            console.error(
                "CAPTION GIF ERROR:",
                err
            );

            return error(
                "Something went wrong while captioning the GIF."
            );
        }
    }
};