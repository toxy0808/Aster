const {
    MessageFlags,
    ContainerBuilder
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
    status
} = require("../utils/asterUI");

const COOLDOWN = 10 * 60 * 1000;

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
// REP CONFIG
// ========================================================

function getRepConfig(guildId) {
    let config = db.prepare(`
        SELECT
            rep_staff_role,
            rep_funder_role,
            rep_member_limit,
            rep_staff_limit,
            rep_funder_limit,
            rep_staff_funder_limit
        FROM server_config
        WHERE guild_id = ?
    `).get(guildId);

    if (!config) {
        db.prepare(`
            INSERT OR IGNORE INTO server_config (
                guild_id,
                rep_member_limit,
                rep_staff_limit,
                rep_funder_limit,
                rep_staff_funder_limit
            )
            VALUES (?, 3, 5, 8, 10)
        `).run(guildId);

        config = db.prepare(`
            SELECT
                rep_staff_role,
                rep_funder_role,
                rep_member_limit,
                rep_staff_limit,
                rep_funder_limit,
                rep_staff_funder_limit
            FROM server_config
            WHERE guild_id = ?
        `).get(guildId);
    }

    return config;
}

// ========================================================
// DAILY LIMIT
// ========================================================

function getDailyLimit(member, config) {
    const isStaff =
        Boolean(
            config.rep_staff_role &&
            member.roles.cache.has(config.rep_staff_role)
        );

    const isFunder =
        Boolean(
            config.rep_funder_role &&
            member.roles.cache.has(config.rep_funder_role)
        );

    if (isStaff && isFunder) {
        return config.rep_staff_funder_limit ?? 10;
    }

    if (isFunder) {
        return config.rep_funder_limit ?? 8;
    }

    if (isStaff) {
        return config.rep_staff_limit ?? 5;
    }

    return config.rep_member_limit ?? 3;
}

// ========================================================
// DAILY RESET
// ========================================================

function resetDaily(user) {
    const now = Date.now();

    if (
        !user.daily_reset ||
        now - user.daily_reset >= 24 * 60 * 60 * 1000
    ) {
        db.prepare(`
            UPDATE reputation
            SET daily_given = 0,
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

// ========================================================
// COMMAND
// ========================================================

module.exports = {
    name: "rep",
    aliases: ["reputation"],

    async execute(message, args) {

        // ====================================================
        // VIEW OWN REP
        // ====================================================

        const target = message.mentions.users.first();

        if (!target) {
            const user = db.prepare(`
                SELECT reputation
                FROM reputation
                WHERE user_id = ?
            `).get(message.author.id);

            const reputation =
                user?.reputation ?? 0;

            const rank =
                db.prepare(`
                    SELECT COUNT(*) + 1 AS rank
                    FROM reputation
                    WHERE reputation > ?
                `).get(reputation).rank;

            const output = buildContainer(
                header(
                    "ASTER / REP",
                    styles.headers.command
                ),

                section(
                    "Reputation",
                    `**${symbols.reputation} ${reputation.toLocaleString()} REP**`,
                    styles.sections.reputation
                ),

                section(
                    "Server Rank",
                    `**#${rank}**`,
                    styles.sections.rank
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
        // VALIDATION
        // ====================================================

        if (target.id === message.author.id) {
            return message.reply(
                `${symbols.error} You can't give reputation to yourself.`
            );
        }

        if (target.bot) {
            return message.reply(
                `${symbols.error} You can't give reputation to bots.`
            );
        }

        // ====================================================
        // REP TYPE
        // ====================================================

        const typeArg =
            args[0]?.toLowerCase();

        const amount =
            typeArg === "-" ||
            typeArg === "negative" ||
            typeArg === "neg"
                ? -1
                : 1;

        // ====================================================
        // CONFIG
        // ====================================================

        const config =
            getRepConfig(
                message.guild.id
            );

        // ====================================================
        // GIVER PROFILE
        // ====================================================

        let giver =
            db.prepare(`
                SELECT *
                FROM reputation
                WHERE user_id = ?
            `).get(message.author.id);

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
                message.author.id,
                Date.now()
            );

            giver =
                db.prepare(`
                    SELECT *
                    FROM reputation
                    WHERE user_id = ?
                `).get(message.author.id);
        }

        // ====================================================
        // DAILY RESET
        // ====================================================

        resetDaily(giver);

        giver =
            db.prepare(`
                SELECT *
                FROM reputation
                WHERE user_id = ?
            `).get(message.author.id);

        // ====================================================
        // DAILY LIMIT
        // ====================================================

        const limit =
            getDailyLimit(
                message.member,
                config
            );

        if (giver.daily_given >= limit) {
            return message.reply(
                `${symbols.warning} Daily REP limit reached.\n` +
                `-# Limit: **${limit}** actions per day`
            );
        }

        // ====================================================
        // PAIR-SPECIFIC COOLDOWN
        // ====================================================

        const recent =
            db.prepare(`
                SELECT created_at
                FROM reputation_logs
                WHERE giver_id = ?
                  AND receiver_id = ?
                ORDER BY id DESC
                LIMIT 1
            `).get(
                message.author.id,
                target.id
            );

        if (recent) {
            const createdAt =
                typeof recent.created_at === "number"
                    ? (
                        recent.created_at > 1e12
                            ? recent.created_at
                            : recent.created_at * 1000
                    )
                    : new Date(
                        recent.created_at
                    ).getTime();

            if (
                Number.isFinite(createdAt) &&
                Date.now() - createdAt < COOLDOWN
            ) {
                return message.reply(
                    `${symbols.pending} REP cooldown active.\n` +
                    `-# You can REP <@${target.id}> again in **10 minutes**.`
                );
            }
        }

        // ====================================================
        // TARGET PROFILE
        // ====================================================

        db.prepare(`
            INSERT OR IGNORE INTO reputation (
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

        // ====================================================
        // UPDATE TARGET
        // ====================================================

        db.prepare(`
            UPDATE reputation
            SET reputation = reputation + ?
            WHERE user_id = ?
        `).run(
            amount,
            target.id
        );

        // ====================================================
        // UPDATE GIVER
        // ====================================================

        db.prepare(`
            UPDATE reputation
            SET daily_given = daily_given + 1
            WHERE user_id = ?
        `).run(
            message.author.id
        );

        // ====================================================
        // LOG
        // ====================================================

        db.prepare(`
            INSERT INTO reputation_logs (
                giver_id,
                receiver_id,
                type
            )
            VALUES (?, ?, ?)
        `).run(
            message.author.id,
            target.id,
            amount > 0
                ? "positive"
                : "negative"
        );

        // ====================================================
        // UPDATED TOTAL
        // ====================================================

        const updated =
            db.prepare(`
                SELECT reputation
                FROM reputation
                WHERE user_id = ?
            `).get(target.id);

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

        const actionSymbol =
            amount > 0
                ? symbols.positive
                : symbols.negative;

        const actionLabel =
            amount > 0
                ? "Positive REP"
                : "Negative REP";

        const action =
            amount > 0
                ? "+"
                : "−";

        const output = buildContainer(
            header(
                "ASTER / REP",
                styles.headers.command
            ),

            status(
                actionLabel,
                `<@${target.id}> received **${action}${Math.abs(amount)} REP**`,
                amount > 0
                    ? "success"
                    : "warning"
            ),

            section(
                "New Total",
                `**${actionSymbol} ${updated.reputation.toLocaleString()} REP**`,
                styles.sections.reputation
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