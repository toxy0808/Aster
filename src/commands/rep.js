const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder
} = require("discord.js");

const db = require("../database/database");
const { syncRepRewards } = require("../systems/repRewards");

const COOLDOWN = 10 * 60 * 1000;
const DEFAULT_BASE_LIMIT = 3;

/* =========================================================
   COMMAND
========================================================= */

module.exports = {
    name: "rep",

    data: new SlashCommandBuilder()
        .setName("rep")
        .setDescription("Give or view reputation.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user to give reputation to.")
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName("type")
                .setDescription("Positive or negative reputation.")
                .setRequired(false)
                .addChoices(
                    {
                        name: "Positive",
                        value: "positive"
                    },
                    {
                        name: "Negative",
                        value: "negative"
                    }
                )
        ),

    async execute(message, args = []) {

        /* =====================================================
           SERVER VALIDATION
        ===================================================== */

        const guild = message.guild;
        const member = message.member;

        if (!guild || !member) {
            return message.reply({
                content:
                    "This command can only be used inside a server."
            });
        }

        /* =====================================================
           ARGUMENTS
        ===================================================== */

        let target = null;
        let type = null;

        /*
         * Slash command.
         */
        if (message.options?.getUser) {

            target = message.options.getUser("user");
            type = message.options.getString("type");

        } else {

            /*
             * Prefix command compatibility.
             */
            if (args[0]) {

                const userId = String(args[0])
                    .replace(/[<@!>]/g, "");

                target = await message.client.users
                    .fetch(userId)
                    .catch(() => null);
            }

            if (args[1]) {
                type = String(args[1]).toLowerCase();
            }
        }

        /* =====================================================
           GET SERVER REP CONFIG
        ===================================================== */

        let config = db.prepare(`
            SELECT
                rep_member_limit
            FROM server_config
            WHERE guild_id = ?
        `).get(guild.id);

        /*
         * Make sure a configuration row exists.
         */
        if (!config) {

            db.prepare(`
                INSERT INTO server_config (
                    guild_id,
                    rep_member_limit
                )
                VALUES (?, ?)
            `).run(
                guild.id,
                DEFAULT_BASE_LIMIT
            );

            config = db.prepare(`
                SELECT
                    rep_member_limit
                FROM server_config
                WHERE guild_id = ?
            `).get(guild.id);
        }

        /* =====================================================
           VIEW OWN REP
        ===================================================== */

        if (!target) {

            const profile = db.prepare(`
                SELECT
                    reputation,
                    daily_given,
                    daily_reset
                FROM reputation
                WHERE user_id = ?
            `).get(member.id);

            const reputation =
                Number(profile?.reputation ?? 0);

            const dailyGiven =
                Number(profile?.daily_given ?? 0);

            /*
             * Base limit.
             */
            const configuredBase =
                Number(config?.rep_member_limit);

            const baseLimit =
                Number.isInteger(configuredBase) &&
                configuredBase >= 0
                    ? configuredBase
                    : DEFAULT_BASE_LIMIT;

            /*
             * Add every matching role bonus.
             */
            let limit = baseLimit;

            const roleBonuses = db.prepare(`
                SELECT
                    role_id,
                    bonus
                FROM rep_role_limits
                WHERE guild_id = ?
            `).all(guild.id);

            for (const roleBonus of roleBonuses) {

                const bonus =
                    Number(roleBonus.bonus);

                if (
                    !Number.isInteger(bonus) ||
                    bonus < 0
                ) {
                    continue;
                }

                /*
                 * Only current Discord roles count.
                 */
                if (
                    member.roles.cache.has(
                        roleBonus.role_id
                    )
                ) {
                    limit += bonus;
                }
            }

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(text =>
                            text.setContent(
                                `## ⭐ Your Reputation\n\n` +
                                `**Reputation:** ${reputation}\n` +
                                `**Daily given:** ${dailyGiven}/${limit}`
                            )
                        )
                ]
            });
        }

        /* =====================================================
           TARGET VALIDATION
        ===================================================== */

        if (target.id === member.id) {

            return message.reply({
                content:
                    "You cannot give reputation to yourself."
            });
        }

        if (target.bot) {

            return message.reply({
                content:
                    "You cannot give reputation to bots."
            });
        }

        if (!type) {
            type = "positive";
        }

        if (
            !["positive", "negative"].includes(type)
        ) {

            return message.reply({
                content:
                    "Invalid reputation type."
            });
        }

        /* =====================================================
           GIVER PROFILE
        ===================================================== */

        let giver = db.prepare(`
            SELECT
                user_id,
                reputation,
                daily_given,
                daily_reset
            FROM reputation
            WHERE user_id = ?
        `).get(member.id);

        if (!giver) {

            db.prepare(`
                INSERT INTO reputation (
                    user_id,
                    reputation,
                    daily_given,
                    daily_reset
                )
                VALUES (?, 0, 0, ?)
            `).run(
                member.id,
                Date.now()
            );

            giver = db.prepare(`
                SELECT
                    user_id,
                    reputation,
                    daily_given,
                    daily_reset
                FROM reputation
                WHERE user_id = ?
            `).get(member.id);
        }

        /* =====================================================
           DAILY RESET
        ===================================================== */

        const now = Date.now();

        if (
            !giver.daily_reset ||
            now - giver.daily_reset >= 24 * 60 * 60 * 1000
        ) {

            db.prepare(`
                UPDATE reputation
                SET
                    daily_given = 0,
                    daily_reset = ?
                WHERE user_id = ?
            `).run(
                now,
                member.id
            );

            giver = db.prepare(`
                SELECT
                    user_id,
                    reputation,
                    daily_given,
                    daily_reset
                FROM reputation
                WHERE user_id = ?
            `).get(member.id);
        }

        /* =====================================================
           DYNAMIC DAILY LIMIT
        ===================================================== */

        const configuredBase =
            Number(config?.rep_member_limit);

        const baseLimit =
            Number.isInteger(configuredBase) &&
            configuredBase >= 0
                ? configuredBase
                : DEFAULT_BASE_LIMIT;

        let limit = baseLimit;

        const roleBonuses = db.prepare(`
            SELECT
                role_id,
                bonus
            FROM rep_role_limits
            WHERE guild_id = ?
        `).all(guild.id);

        for (const roleBonus of roleBonuses) {

            const bonus =
                Number(roleBonus.bonus);

            /*
             * Ignore malformed database values.
             */
            if (
                !Number.isInteger(bonus) ||
                bonus < 0
            ) {
                continue;
            }

            /*
             * Stack every role the member currently has.
             */
            if (
                member.roles.cache.has(
                    roleBonus.role_id
                )
            ) {
                limit += bonus;
            }
        }

        /* =====================================================
           DAILY LIMIT CHECK
        ===================================================== */

        if (giver.daily_given >= limit) {

            return message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(text =>
                            text.setContent(
                                `## ⛔ Daily Limit Reached\n\n` +
                                `You have used your entire reputation allowance for this reset period.\n\n` +
                                `**Used:** ${giver.daily_given}/${limit}`
                            )
                        )
                ]
            });
        }

        /* =====================================================
           10-MINUTE GIVER → RECEIVER COOLDOWN
        ===================================================== */

        const lastRep = db.prepare(`
            SELECT
                created_at
            FROM reputation_logs
            WHERE giver_id = ?
              AND receiver_id = ?
            ORDER BY id DESC
            LIMIT 1
        `).get(
            member.id,
            target.id
        );

        if (lastRep?.created_at) {

            const lastTimestamp =
                new Date(
                    lastRep.created_at
                ).getTime();

            if (
                Number.isFinite(lastTimestamp) &&
                Date.now() - lastTimestamp < COOLDOWN
            ) {

                const remaining = Math.ceil(
                    (
                        COOLDOWN -
                        (
                            Date.now() -
                            lastTimestamp
                        )
                    ) / 60000
                );

                return message.reply({
                    content:
                        `You must wait about ${remaining} minute(s) before giving reputation to this user again.`
                });
            }
        }

        /* =====================================================
           TARGET PROFILE
        ===================================================== */

        let receiver = db.prepare(`
            SELECT
                user_id,
                reputation
            FROM reputation
            WHERE user_id = ?
        `).get(target.id);

        if (!receiver) {

            db.prepare(`
                INSERT INTO reputation (
                    user_id,
                    reputation,
                    daily_given,
                    daily_reset
                )
                VALUES (?, 0, 0, ?)
            `).run(
                target.id,
                Date.now()
            );

            receiver = db.prepare(`
                SELECT
                    user_id,
                    reputation
                FROM reputation
                WHERE user_id = ?
            `).get(target.id);
        }

        /* =====================================================
           UPDATE REPUTATION
        ===================================================== */

        const amount =
            type === "positive"
                ? 1
                : -1;

        db.prepare(`
            UPDATE reputation
            SET reputation = reputation + ?
            WHERE user_id = ?
        `).run(
            amount,
            target.id
        );

        /*
         * Positive and negative reputation both count as
         * one daily action.
         */
        db.prepare(`
            UPDATE reputation
            SET daily_given = daily_given + 1
            WHERE user_id = ?
        `).run(member.id);

        /* =====================================================
           LOG
        ===================================================== */

        db.prepare(`
            INSERT INTO reputation_logs (
                giver_id,
                receiver_id,
                type
            )
            VALUES (?, ?, ?)
        `).run(
            member.id,
            target.id,
            type
        );

        /* =====================================================
           REWARD SYNC
        ===================================================== */

        try {

            await syncRepRewards(
                guild,
                target.id
            );

        } catch (error) {

            console.error(
                "[ASTER] Failed to sync reputation rewards:",
                error
            );
        }

        /* =====================================================
           FINAL VALUES
        ===================================================== */

        const updatedReceiver = db.prepare(`
            SELECT
                reputation
            FROM reputation
            WHERE user_id = ?
        `).get(target.id);

        const updatedGiver = db.prepare(`
            SELECT
                daily_given
            FROM reputation
            WHERE user_id = ?
        `).get(member.id);

        const symbol =
            type === "positive"
                ? "+"
                : "-";

        /* =====================================================
           RESPONSE
        ===================================================== */

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
                new ContainerBuilder()
                    .addTextDisplayComponents(text =>
                        text.setContent(
                            `## ⭐ Reputation Given\n\n` +
                            `**${member.user.username}** gave **${symbol}1 reputation** to **${target.username}**.\n\n` +
                            `**${target.username}'s reputation:** ${updatedReceiver.reputation}\n` +
                            `**Your daily usage:** ${updatedGiver.daily_given}/${limit}`
                        )
                    )
            ]
        });
    }
};