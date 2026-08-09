const db = require("../database/database");

const DAILY_LIMITS = {
    member: 3,
    staff: 5,
    funder: 8,
    staff_funder: 10
};

const COOLDOWN = 10 * 60 * 1000; // 10 minutes between reps to the same user

function getDailyLimit(member) {
    const isStaff = member.roles.cache.some(role =>
        role.name.toLowerCase().includes("staff")
    );

    const isFunder = member.roles.cache.some(role =>
        role.name.toLowerCase().includes("funder")
    );

    if (isStaff && isFunder) return DAILY_LIMITS.staff_funder;
    if (isFunder) return DAILY_LIMITS.funder;
    if (isStaff) return DAILY_LIMITS.staff;

    return DAILY_LIMITS.member;
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
                SELECT positive, negative
                FROM reputation
                WHERE user_id = ?
            `).get(message.author.id);

            const positive = user?.positive || 0;
            const negative = user?.negative || 0;
            const net = positive - negative;

            return message.reply(
                `✨ **${message.author.username}**\n` +
                `Positive: **${positive}**\n` +
                `Negative: **${negative}**\n` +
                `Net: **${net}**`
            );
        }

        // =========================
        // VALIDATION
        // =========================

        if (target.id === message.author.id) {
            return message.reply(
                "❌ You can't give reputation to yourself."
            );
        }

        if (target.bot) {
            return message.reply(
                "❌ You can't give reputation to bots."
            );
        }

        // =========================
        // TYPE
        // =========================

        const typeArg = args[0]?.toLowerCase();

        let type = "positive";

        if (
            typeArg === "negative" ||
            typeArg === "neg" ||
            typeArg === "-"
        ) {
            type = "negative";
        }

        // =========================
        // GET GIVER
        // =========================

        let giver = db.prepare(`
            SELECT *
            FROM reputation
            WHERE user_id = ?
        `).get(message.author.id);

        if (!giver) {

            db.prepare(`
                INSERT INTO reputation
                (user_id, positive, negative, daily_given, daily_reset)
                VALUES (?, 0, 0, 0, ?)
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

        const limit = getDailyLimit(message.member);

        if (giver.daily_given >= limit) {
            return message.reply(
                `⏳ You've reached your daily reputation limit of **${limit}**.`
            );
        }

        // =========================
        // ANTI-SPAM
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

            const lastTime = new Date(recent.created_at).getTime();

            if (Date.now() - lastTime < COOLDOWN) {
                return message.reply(
                    "⏳ You recently gave reputation to this user. Try again later."
                );
            }
        }

        // =========================
        // TARGET
        // =========================

        db.prepare(`
            INSERT OR IGNORE INTO reputation
            (user_id, positive, negative, daily_given, daily_reset)
            VALUES (?, 0, 0, 0, ?)
        `).run(
            target.id,
            Date.now()
        );

        // =========================
        // UPDATE REP
        // =========================

        if (type === "negative") {

            db.prepare(`
                UPDATE reputation
                SET negative = negative + 1
                WHERE user_id = ?
            `).run(target.id);

        } else {

            db.prepare(`
                UPDATE reputation
                SET positive = positive + 1
                WHERE user_id = ?
            `).run(target.id);
        }

        // =========================
        // UPDATE DAILY USAGE
        // =========================

        db.prepare(`
            UPDATE reputation
            SET daily_given = daily_given + 1
            WHERE user_id = ?
        `).run(message.author.id);

        // =========================
        // LOG
        // =========================

        db.prepare(`
            INSERT INTO reputation_logs
            (giver_id, receiver_id, type)
            VALUES (?, ?, ?)
        `).run(
            message.author.id,
            target.id,
            type
        );

        // =========================
        // RESULT
        // =========================

        const updated = db.prepare(`
            SELECT positive, negative
            FROM reputation
            WHERE user_id = ?
        `).get(target.id);

        const symbol = type === "negative" ? "⚠️" : "✨";

        return message.reply(
            `${symbol} **${target.username}** received **+1 ${type} reputation**!\n` +
            `✨ Positive: **${updated.positive}** | ` +
            `⚠️ Negative: **${updated.negative}**`
        );
    }
};