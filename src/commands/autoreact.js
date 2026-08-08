const db = require("../database/database");

module.exports = {
    name: "autoreact",

        async execute(message, args) {

                if (!message.member.permissions.has("Administrator")) {
                            return message.reply("You don't have permission to use this command.");
                                    }

                                            const action = args[0];
                                                    const user = message.mentions.users.first();

                                                            if (!action || !user) {
                                                                        return message.reply(
                                                                                        "Usage: ,autoreact enable @user <:emoji> OR ,autoreact disable @user"
                                                                                                    );
                                                                                                            }

                                                                                                                    if (action === "enable") {
                                                                                                                                const emoji = args[2];

                                                                                                                                            if (!emoji) {
                                                                                                                                                            return message.reply("Please provide an emoji.");
                                                                                                                                                                        }

                                                                                                                                                                                    db.prepare(`
                                                                                                                                                                                                    INSERT INTO autoreacts (user_id, emoji, enabled)
                                                                                                                                                                                                                    VALUES (?, ?, 1)
                                                                                                                                                                                                                                    ON CONFLICT(user_id)
                                                                                                                                                                                                                                                    DO UPDATE SET emoji = ?, enabled = 1
                                                                                                                                                                                                                                                                `).run(user.id, emoji, emoji);

                                                                                                                                                                                                                                                                            return message.reply(
                                                                                                                                                                                                                                                                                            `Auto react enabled for ${user} → ${emoji}`
                                                                                                                                                                                                                                                                                                        );
                                                                                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                                                                                        if (action === "disable") {
                                                                                                                                                                                                                                                                                                                                    db.prepare(`
                                                                                                                                                                                                                                                                                                                                                    DELETE FROM autoreacts
                                                                                                                                                                                                                                                                                                                                                                    WHERE user_id = ?
                                                                                                                                                                                                                                                                                                                                                                                `).run(user.id);

                                                                                                                                                                                                                                                                                                                                                                                            return message.reply(
                                                                                                                                                                                                                                                                                                                                                                                                            `Auto react disabled for ${user}.`
                                                                                                                                                                                                                                                                                                                                                                                                                        );
                                                                                                                                                                                                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                                                                                                                                                                                                        return message.reply(
                                                                                                                                                                                                                                                                                                                                                                                                                                                    "Use \`,autoreact enable @user <:emoji>\` or \`,autoreact disable @user\`."
                                                                                                                                                                                                                                                                                                                                                                                                                                                            );
                                                                                                                                                                                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                };
