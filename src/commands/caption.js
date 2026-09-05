const {
    AttachmentBuilder
} = require("discord.js");

const asterUI = require("../utils/asterUI");
const {
    parseCaptionArgs
} = require("../utils/caption/parser");
const {
    prepareAttachment
} = require("../utils/caption/processor");

module.exports = {
    name: "caption",
    aliases: [],

    async execute(message, args) {
        const parsed = parseCaptionArgs(args);

        if (parsed.action === "help") {
            return message.reply(
                asterUI.container(
                    asterUI.header("Caption"),
                    asterUI.section(
                        "Usage",
                        [
                            "` ,caption \"text\" ` — add or replace a caption",
                            "` ,caption remove ` — remove the caption",
                            "` ,caption = ` — show this guide"
                        ].join("\n")
                    )
                )
            );
        }

        if (!message.reference?.messageId) {
            return message.reply(
                asterUI.container(
                    asterUI.status(
                        "Reply required",
                        "Reply to a message containing an image or GIF.",
                        "warning"
                    )
                )
            );
        }

        const target = await message.channel.messages
            .fetch(message.reference.messageId)
            .catch(() => null);

        if (!target) {
            return message.reply(
                asterUI.container(
                    asterUI.status(
                        "Unavailable",
                        "I couldn't access the replied message.",
                        "error"
                    )
                )
            );
        }

        if (!target.attachments.size) {
            return message.reply(
                asterUI.container(
                    asterUI.status(
                        "No attachment",
                        "The replied message doesn't contain an attachment.",
                        "warning"
                    )
                )
            );
        }

        if (parsed.action === "remove") {
            return removeCaptions(message, target);
        }

        return setCaption(
            message,
            target,
            parsed.caption
        );
    }
};

async function setCaption(message, target, caption) {
    const files = [];

    try {
        for (const attachment of target.attachments.values()) {
            const prepared =
                await prepareAttachment(attachment);

            files.push(
                new AttachmentBuilder(
                    prepared.buffer,
                    {
                        name: prepared.name,
                        description: caption
                    }
                )
            );
        }

        await message.channel.send({
            files,
            allowedMentions: {
                parse: []
            }
        });

        await message.delete().catch(() => {});
        await target.delete().catch(() => {});

    } catch (error) {
        console.error(
            "CAPTION SET ERROR:",
            error
        );

        await message.reply(
            asterUI.container(
                asterUI.status(
                    "Caption failed",
                    error.message ||
                    "I couldn't process the attachment.",
                    "error"
                )
            )
        );
    }
}

async function removeCaptions(message, target) {
    const files = [];

    try {
        for (const attachment of target.attachments.values()) {
            const prepared =
                await prepareAttachment(attachment);

            files.push(
                new AttachmentBuilder(
                    prepared.buffer,
                    {
                        name: prepared.name
                    }
                )
            );
        }

        await message.channel.send({
            files,
            allowedMentions: {
                parse: []
            }
        });

        await message.delete().catch(() => {});
        await target.delete().catch(() => {});

    } catch (error) {
        console.error(
            "CAPTION REMOVE ERROR:",
            error
        );

        await message.reply(
            asterUI.container(
                asterUI.status(
                    "Caption removal failed",
                    error.message ||
                    "I couldn't process the attachment.",
                    "error"
                )
            )
        );
    }
}