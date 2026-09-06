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
   REP CONFIG
========================================================= */

function getRepConfig(guildId) {
    let config = db.prepare(`
        SELECT
            rep_member_limit
        FROM server_config
        WHERE guild_id = ?
    `).get(guildId);

    if (!config) {
        db.prepare(`
            INSERT INTO server_config (
                guild_id,
                rep_member_limit
            )
            VALUES (?, ?)
        `).run(guildId, DEFAULT_BASE_LIMIT);

        config = db.prepare(`
            SELECT
                rep_member_limit
            FROM server_config
            WHERE guild_id = ?
        `).get(guildId);
    }

    return config;
}

/* =========================================================
   DAILY LIMIT
========================================================= */

function getDailyLimit(member, config = null) {
    const currentConfig =
        config || getRepConfig(member.guild.id);

    const configuredBase = Number(
        currentConfig?.rep_member_limit
    );

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
    `).all(member.guild.id);

    for (const roleBonus of roleBonuses) {
        const bonus = Number(roleBonus.bonus);

        if (
            !Number.isInteger(bonus) ||
            bonus < 0
        ) {
            continue;
        }

        /*
         * Only the member's CURRENT Discord roles matter.
         *
         * Deleted roles simply won't exist in the member's
         * role cache, so their bonus is ignored safely.
         */
        if (member.roles.cache.has(roleBonus.role_id)) {
            limit += bonus;
        }
    }

    return limit;
}

/* =========================================================
   DAILY RESET
========================================================= */

function resetDaily(user) {
    const now = Date.now();

    if (
        !user.daily_reset ||
        now - user.daily_reset >= 24 * 60 * 60 * 1000
    ) {
        db.prepare(`
            UPDATE reputation
            SET
                daily_given = 0,
                daily_reset = ?
            WHERE user_id = ?
        `).run(
            now,
            user.user_id
        );

        return true;
    }

    return false;
}

/* =========================================================
   COMMAND
========================================================= */

module.exports = {
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
        const guild = message.guild;
        const member = message.member;

        if (!guild || !member) {
            return message.reply({
                content:
                    "This command can only be used inside a server."
            });
        }

        let target = null;
        let type = null;

        /* =====================================================
           ARGUMENT COMPATIBILITY
        ===================================================== */

        if (message.options) {
            target = message.options.getUser("user");
            type = message.options.getString("type");
        } else {
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
                profile?.reputation ?? 0;

            const config =
                getRepConfig(guild.id);

            const limit =
                getDailyLimit(member, config);

            const dailyGiven =
                profile?.daily_given ?? 0;

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
           VALIDATION
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
           CONFIG
        ===================================================== */

        const config =
            getRepConfig(guild.id);

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

        resetDaily(giver);

        /*
         * Re-read after reset.
         */
        giver = db.prepare(`
            SELECT
                user_id,
                reputation,
                daily_given,
                daily_reset
            FROM reputation
            WHERE user_id = ?
        `).get(member.id);

        /* =====================================================
           CURRENT DYNAMIC DAILY LIMIT
        ===================================================== */

        const limit =
            getDailyLimit(member, config);

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
                new Date(lastRep.created_at).getTime();

            if (
                Number.isFinite(lastTimestamp) &&
                Date.now() - lastTimestamp < COOLDOWN
            ) {
                const remaining = Math.ceil(
                    (
                        COOLDOWN -
                        (Date.now() - lastTimestamp)
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
         * Both positive and negative reputation count as one
         * daily action.
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
            /*
             * IMPORTANT:
             * syncRepRewards requires both the guild and the
             * receiving user's ID.
             */
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
           RESPONSE
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
    },

    getDailyLimit
};