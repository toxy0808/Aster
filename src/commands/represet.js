const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../database/database");
const { syncRepRewards } = require("../utils/repRewards");

const {
    symbols,
    timestamps,
    styles,
    header,
    section,
    stat,
    separator
} = require("../utils/asterUI");

// ========================================================
// ASTER COMPONENT BUILDER
// ========================================================

function buildContainer(...components) {
    const output = new ContainerBuilder();

    for (const component of components.flat()) {
        if (!component) continue;

        if (component.constructor?.name === "SeparatorBuilder") {
            output.addSeparatorComponents(component);
        } else {
            output.addTextDisplayComponents(component);
        }
    }

    return output;
}

// ========================================================
// COMMAND
// ========================================================

module.exports = {
    name: "represet",
    aliases: ["resetrep"],

    data: new SlashCommandBuilder()
        .setName("represet")
        .setDescription("Reset or set a member's reputation.")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator.toString()
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The member whose REP should be reset.")
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("The new REP value. Defaults to 0.")
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName("all")
                .setDescription("Type confirm to reset everyone's REP.")
                .setRequired(false)
                .addChoices({
                    name: "Confirm reset everyone",
                    value: "confirm"
                })
        ),

    async execute(message, args) {

        // ====================================================
        // SLASH ARGUMENT ADAPTER
        // ====================================================

        const slashUser =
            message.options?.getUser("user");

        const slashAmount =
            message.options?.getInteger("amount");

        const slashAll =
            message.options?.getString("all");

        if (message.options?.getUser) {
            if (slashUser) {
                message.mentions.users.first = () => slashUser;
            }

            if (slashAll === "confirm") {
                args = ["all", "confirm"];
            } else if (slashUser) {
                args = [slashUser.id];

                if (slashAmount !== null) {
                    args.push(String(slashAmount));
                }
            }
        }

        // ====================================================
        // ADMIN CHECK
        // ====================================================

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply(
                `${symbols.error} Administrator permission required.`
            );
        }

        // ====================================================
        // TARGET
        // ====================================================

        const target = message.mentions.users.first();

        const isEveryone =
            args[0]?.toLowerCase() === "all";

        // ====================================================
        // USAGE
        // ====================================================

        if (!target && !isEveryone) {
            const output = buildContainer(
                header(
                    "ASTER / REP RESET",
                    styles.sections.reputation
                ),

                separator(),

                section(
                    "Usage",
                    "`,represet @user` → reset to **0 REP**\n" +
                    "`,represet @user 25` → set to **25 REP**\n" +
                    "`,represet all confirm` → reset everyone",
                    styles.status.info
                )
            );

            return message.reply({
                components: [output],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: []
                }
            });
        }

        // ====================================================
        // EVERYONE
        // ====================================================

        if (isEveryone) {

            if (args[1]?.toLowerCase() !== "confirm") {
                return message.reply(
                    `${symbols.warning} This will reset **everyone's REP**.\n` +
                    `-# Use \`,represet all confirm\` to continue.`
                );
            }

            db.prepare(`
                UPDATE reputation
                SET reputation = 0,
                    daily_given = 0,
                    daily_reset = ?
            `).run(Date.now());

            // Sync rewards for every user
            const users = db.prepare(`
                SELECT user_id
                FROM reputation
            `).all();

            for (const user of users) {
                try {
                    await syncRepRewards(
                        message.guild,
                        user.user_id
                    );
                } catch {
                    // Keep reset successful if a reward sync fails.
                }
            }

            const output = buildContainer(
                header(
                    "ASTER / REP RESET",
                    styles.sections.reputation
                ),

                section(
                    "Reset Complete",
                    `${symbols.negative} **Everyone** is now at **0 REP**.`,
                    styles.sections.reputation
                ),

                separator(),

                stat(
                    "Reset By",
                    `<@${message.author.id}>`,
                    symbols.info
                ),

                stat(
                    "Updated",
                    timestamps.now(),
                    symbols.time
                )
            );

            return message.reply({
                components: [output],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: []
                }
            });
        }

        // ====================================================
        // USER VALIDATION
        // ====================================================

        if (target.bot) {
            return message.reply(
                `${symbols.error} You can't reset a bot's REP.`
            );
        }

        if (target.id === message.author.id) {
            return message.reply(
                `${symbols.error} You can't reset your own REP.`
            );
        }

        // ====================================================
        // REP VALUE
        // ====================================================

        const valueArg = args.find(
            arg => /^-?\d+$/.test(arg)
        );

        const newValue =
            valueArg === undefined
                ? 0
                : Number(valueArg);

        if (!Number.isInteger(newValue)) {
            return message.reply(
                `${symbols.error} REP must be a whole number.`
            );
        }

        // ====================================================
        // UPDATE / CREATE PROFILE
        // ====================================================

        db.prepare(`
            INSERT INTO reputation (
                user_id,
                reputation,
                daily_given,
                daily_reset
            )
            VALUES (?, ?, 0, ?)
            ON CONFLICT(user_id)
            DO UPDATE SET
                reputation = excluded.reputation
        `).run(
            target.id,
            newValue,
            Date.now()
        );

        // ====================================================
        // REWARDS
        // ====================================================

        await syncRepRewards(
            message.guild,
            target.id
        );

        // ====================================================
        // RESULT
        // ====================================================

        const output = buildContainer(
            header(
                "ASTER / REP RESET",
                styles.sections.reputation
            ),

            section(
                "Reset Complete",
                `${symbols.negative} <@${target.id}> is now at ` +
                `**${newValue.toLocaleString()} REP**.`,
                styles.sections.reputation
            ),

            separator(),

            stat(
                "Reset By",
                `<@${message.author.id}>`,
                symbols.info
            ),

            stat(
                "Updated",
                timestamps.now(),
                symbols.time
            )
        );

        return message.reply({
            components: [output],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: {
                parse: []
            }
        });
    }
};