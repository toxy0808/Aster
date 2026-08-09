module.exports = {
    name: "ping",
    aliases: ["p"],

    async execute(message) {
        return message.reply(
            `🏓 Pong! **${message.client.ws.ping}ms**`
        );
    }
};