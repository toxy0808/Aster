function createCommandMessage(interaction) {

    const options = interaction.options;

    const mentionedUsers = [];

    for (const option of options.data ?? []) {

        if (option.user) {
            mentionedUsers.push(option.user);
        }

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
                first: () => mentionedUsers[0] || null
            }
        },

        // ========================================================
        // SLASH OPTIONS
        // ========================================================

        options,

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