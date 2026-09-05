const {
    AttachmentBuilder,
    MessageFlags
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

        // ------------------------------------------------
        // HELP
        // ------------------------------------------------

        if (parsed.action === "help") {
            return message.reply({
                components: [
                    asterUI.container(
                        asterUI.header("Caption"),
                        asterUI.section(
                            "Usage",
                            [
                                "`,caption \"text\"` — add or replace a caption",
                                "`,caption remove` — remove the caption",
                                "`,caption =` — show this guide"
                            ].join("\n")
                        )
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ------------------------------------------------
        // REPLY CHECK
        // ------------------------------------------------

        if (!message.reference?.messageId) {
            return message.reply({
                components: [
                    asterUI.container(
                        asterUI.status(
                            "Reply required",
                            "Reply to a message containing an image or GIF.",
                            "warning"
                        )
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ------------------------------------------------
        // FETCH TARGET
        // ------------------------------------------------

        const target =
            await message.channel.messages
                .fetch(message.reference.messageId)
                .catch(() => null);

        if (!target) {
            return message.reply({
                components: [
                    asterUI.container(
                        asterUI.status(
                            "Unavailable",
                            "I couldn't access the replied message.",
                            "error"
                        )
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ------------------------------------------------
        // ATTACHMENT CHECK
        // ------------------------------------------------

        if (!target.attachments.size) {
            return message.reply({
                components: [
                    asterUI.container(
                        asterUI.status(
                            "No attachment",
                            "The replied message doesn't contain an attachment.",
                            "warning"
                        )
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ------------------------------------------------
        // REMOVE
        // ------------------------------------------------

        if (parsed.action === "remove") {
            return removeCaptions(
                message,
                target
            );
        }

        // ------------------------------------------------
        // SET
        // ------------------------------------------------

        return setCaption(
            message,
            target,
            parsed.caption
        );
    }
};

// ========================================================
// SET CAPTION
// ========================================================

async function setCaption(
    message,
    target,
    caption
) {
    const files = [];

    try {
        for (
            const attachment
            of target.attachments.values()
        ) {
            const prepared =
                await prepareAttachment(
                    attachment
                );

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

        // --------------------------------------------
        // SEND REPLACEMENT
        // --------------------------------------------

        await message.channel.send({
            files,

            allowedMentions: {
                parse: []
            }
        });

        // --------------------------------------------
        // CLEANUP
        // --------------------------------------------

        await message
            .delete()
            .catch(() => {});

        await target
            .delete()
            .catch(() => {});

    } catch (error) {
        console.error(
            "CAPTION SET ERROR:",
            error
        );

        await message.reply({
            components: [
                asterUI.container(
                    asterUI.status(
                        "Caption failed",
                        error.message ||
                        "I couldn't process the attachment.",
                        "error"
                    )
                )
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
}

// ========================================================
// REMOVE CAPTION
// ========================================================

async function removeCaptions(
    message,
    target
) {
    const files = [];

    try {
        for (
            const attachment
            of target.attachments.values()
        ) {
            const prepared =
                await prepareAttachment(
                    attachment
                );

            files.push(
                new AttachmentBuilder(
                    prepared.buffer,
                    {
                        name: prepared.name
                    }
                )
            );
        }

        // --------------------------------------------
        // SEND REPLACEMENT
        // --------------------------------------------

        await message.channel.send({
            files,

            allowedMentions: {
                parse: []
            }
        });

        // --------------------------------------------
        // CLEANUP
        // --------------------------------------------

        await message
            .delete()
            .catch(() => {});

        await target
            .delete()
            .catch(() => {});

    } catch (error) {
        console.error(
            "CAPTION REMOVE ERROR:",
            error
        );

        await message.reply({
            components: [
                asterUI.container(
                    asterUI.status(
                        "Caption removal failed",
                        error.message ||
                        "I couldn't process the attachment.",
                        "error"
                    )
                )
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
}