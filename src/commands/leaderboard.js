const db = require("../database/database");
const { EmbedBuilder } = require("discord.js");

module.exports = {

    name: "leaderboard",

    aliases: [
        "lb",
        "top"
    ],


    async execute(message, args) {

        console.log("LB ARGS:", args);


        const type = args[0] || "chat";

        let users;


        // CHAT

        if (type === "chat") {

            users = db.prepare(`
                SELECT *
                FROM users
                ORDER BY messages DESC
                LIMIT 10
            `).all();

        }


        // VOICE

        else if (type === "voice") {

            users = db.prepare(`
                SELECT *
                FROM users
                WHERE voice_time > 0
                ORDER BY voice_time DESC
                LIMIT 10
            `).all();

        }


        // OVERALL

        else if (type === "overall") {

            users = db.prepare(`
                SELECT *,
                (messages + voice_time) AS activity
                FROM users
                ORDER BY activity DESC
                LIMIT 10
            `).all();

        }


        else {

            return message.reply(
                "Invalid type. Use: chat, voice, overall"
            );

        }



        if (!users.length) {

            return message.reply(
                "No users found."
            );

        }



        let description = "";


        for (let i = 0; i < users.length; i++) {

            const user = users[i];


            const member =
                await message.guild.members
                .fetch(user.user_id)
                .catch(() => null);



            const username =
                member
                ? member.user.username
                : "Unknown User";



            let value;


            if (type === "chat") {

                value = `${user.messages} messages`;

            }


            else if (type === "voice") {

                value = `${user.voice_time || 0} minutes`;

            }


            else {

                value =
                `${user.messages} msgs + ${user.voice_time || 0} voice min`;

            }



            description +=
            `**#${i + 1} ${username}**\n${value}\n\n`;

        }



        const embed = new EmbedBuilder()

        .setTitle(
            `🏆 ASTER ${type.toUpperCase()} LEADERBOARD`
        )

        .setDescription(description)

        .setColor("#FF006E")

        .setFooter({
            text: "ASTER Activity System"
        })

        .setTimestamp();



        message.reply({
            embeds: [embed]
        });


    }

};