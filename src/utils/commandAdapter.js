function createCommandContext(input, args = []) {
    const isInteraction =
        typeof input.isChatInputCommand === "function" &&
        input.isChatInputCommand();

    if (isInteraction) {
        return {
            type: "slash",
            raw: input,

            user: input.user,
            member: input.member,
            guild: input.guild,
            channel: input.channel,

            args,

            options: input.options,

            reply: (data) => input.reply(data),
            editReply: (data) => input.editReply(data),
            followUp: (data) => input.followUp(data),

            replied: input.replied,
            deferred: input.deferred
        };
    }

    return {
        type: "prefix",
        raw: input,

        user: input.author,
        member: input.member,
        guild: input.guild,
        channel: input.channel,

        args,

        options: null,

        reply: (data) => input.reply(data),
        editReply: (data) => input.edit(data),
        followUp: (data) => input.channel.send(data),

        replied: false,
        deferred: false
    };
}

module.exports = {
    createCommandContext
};