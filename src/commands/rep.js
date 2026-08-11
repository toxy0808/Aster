const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");

const db = require("../database/database");
const { syncRepRewards } = require("../utils/repRewards");

const COOLDOWN = 10 * 60 * 1000;

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

function getDailyLimit(member, config) {

    const isStaff =
        config.rep_staff_role &&
        member.roles.cache.has(config.rep_staff_role);

    const isFunder =
        config.rep_funder_role &&
        member.roles.cache.has(config.rep_funder_role);

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
        `).run(now, user.user_id);

        return true;
    }

    return false;
}

module.exports = {
    name: "rep",
    aliases: ["reputation"],

    async execute(message, args) {

        const target = message.mentions.users.first();

        // =========================
        // VIEW REP
        // =========================

        if (!target) {

            const user = db.prepare(`
                SELECT reputation
                FROM reputation
                WHERE user_id = ?
            `).get(message.author.id);

            const reputation = user?.reputation ?? 0;

            const rank = db.prepare(`
                SELECT COUNT(*) + 1 AS rank
                FROM reputation
                WHERE reputation > ?
            `).get(reputation).rank;

            const container = new ContainerBuilder();

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    "**ASTER**\n" +
                    "REPUTATION"
                )
            );

            container.addSeparatorComponents(
                new SeparatorBuilder()
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `**${message.author.username}**\n` +
                    `**${reputation.toLocaleString()} REP**  ·  #${rank}`
                )
            );

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: []
                }
            });
        }

        // =========================
        // VALIDATION
        // =========================

        if (target.id === message.author.id) {
            return message.reply(
                "You can't give reputation to yourself."
            );
        }

        if (target.bot) {
            return message.reply(
                "You can't give reputation to bots."
            );
        }

        // =========================
        // REP TYPE
        // =========================

        const typeArg = args[0]?.toLowerCase();

        let amount = 1;

        if (
            typeArg === "-" ||
            typeArg === "negative" ||
            typeArg === "neg"
        ) {
            amount = -1;
        }

        // =========================
        // CONFIG
        // =========================

        const config = getRepConfig(message.guild.id);

        // =========================
        // GIVER
        // =========================

        let giver = db.prepare(`
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

            giver = db.prepare(`
                SELECT *
                FROM reputation
                WHERE user_id = ?
            `).get(message.author.id);
        }

        // =========================
        // DAILY RESET
        // =========================

        resetDaily(giver);

        giver = db.prepare(`
            SELECT *
            FROM reputation
            WHERE user_id = ?
        `).get(message.author.id);

        // =========================
        // DAILY LIMIT
        // =========================

        const limit = getDailyLimit(
            message.member,
            config
        );

        if (giver.daily_given >= limit) {
            return message.reply(
                `Daily reputation limit reached · **${limit}**`
            );
        }

        // =========================
        // COOLDOWN
        // =========================

        const recent = db.prepare(`
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

            const lastTime =
                new Date(recent.created_at).getTime();

            if (Date.now() - lastTime < COOLDOWN) {
                return message.reply(
                    "Reputation cooldown active · Try again later."
                );
            }
        }

        // =========================
        // TARGET
        // =========================

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

        // =========================
        // UPDATE
        // =========================

        db.prepare(`
            UPDATE reputation
            SET reputation = reputation + ?
            WHERE user_id = ?
        `).run(
            amount,
            target.id
        );

        db.prepare(`
            UPDATE reputation
            SET daily_given = daily_given + 1
            WHERE user_id = ?
        `).run(
            message.author.id
        );

        // =========================
        // LOG
        // =========================

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

        // =========================
        // UPDATED REP
        // =========================

        const updated = db.prepare(`
            SELECT reputation
            FROM reputation
            WHERE user_id = ?
        `).get(target.id);

        await syncRepRewards(
            message.guild,
            target.id
        );

        // =========================
        // RESULT
        // =========================

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "**ASTER**\n" +
                "REPUTATION"
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `${amount > 0 ? "+" : "-"}${Math.abs(amount)} REP\n` +
                `<@${target.id}>`
            )
        );

        container.addSeparatorComponents(
            new SeparatorBuilder()
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**${updated.reputation.toLocaleString()} REP**  ·  TOTAL`
            )
        );

        return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: {
                parse: []
            }
        });
    }
};