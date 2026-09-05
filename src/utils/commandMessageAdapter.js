function createCommandMessage(interaction) {

    const options = interaction.options;

    const mentionedUsers = [];

    for (const option of options.data ?? []) {

        if (option.user) {
            mentionedUsers.push(option.user);
        }

    }

    // ========================================================
    // SLASH COMMAND ATTACHMENTS
    // ========================================================

    let attachment = null;

    try {

        attachment =
            options.getAttachment?.("attachment") ||
            options.getAttachment?.("media") ||
            null;

    } catch (error) {

        console.error(
            "ASTER: Failed to read slash command attachment:",
            error
        );

    }

    return {

        // ========================================================
        // CORE MESSAGE PROPERTIES
        // ========================================================

        author: interaction.user,

        member: interaction.member,

        guild: interaction.guild,

        channel: interaction.channel,

        client: interaction.client,

        // ========================================================
        // MENTIONS
        // ========================================================

        mentions: {

            users: {

                first: () => {
                    return mentionedUsers[0] || null;
                }

            }

        },

        // ========================================================
        // SLASH OPTIONS
        // ========================================================

        options,

        // ========================================================
        // ATTACHMENTS
        // ========================================================

        attachments: {

            first: () => {
                return attachment;
            },

            get: (name) => {

                if (
                    name === "attachment" ||
                    name === "media"
                ) {
                    return attachment;
                }

                return null;
            },

            size: attachment ? 1 : 0,

            values: function* () {

                if (attachment) {
                    yield attachment;
                }

            }

        },

        // ========================================================
        // DIRECT ATTACHMENT
        // ========================================================

        attachment,

        // ========================================================
        // REPLY
        // ========================================================

        reply: async (data) => {

            if (
                interaction.replied ||
                interaction.deferred
            ) {

                return interaction.followUp(data);

            }

            return interaction.reply(data);

        },

        // ========================================================
        // EDIT
        // ========================================================

        edit: async (data) => {

            return interaction.editReply(data);

        },

        // ========================================================
        // FOLLOW UP
        // ========================================================

        followUp: async (data) => {

            return interaction.followUp(data);

        }

    };

}

module.exports = {
    createCommandMessage
};