const db = require("../database/database");

async function syncRepRewards(guild, userId) {
    if (!guild || !userId) return;

    const user = db.prepare(`
        SELECT reputation
        FROM reputation
        WHERE user_id = ?
    `).get(userId);

    if (!user) return;

    const member = await guild.members
        .fetch(userId)
        .catch(() => null);

    if (!member) return;

    const me = guild.members.me;
    if (!me) return;

    const rewards = db.prepare(`
        SELECT
            role_id,
            threshold,
            enabled
        FROM reputation_rewards
        WHERE guild_id = ?
    `).all(guild.id);

    for (const reward of rewards) {
        const role = guild.roles.cache.get(reward.role_id);

        if (!role) continue;

        // Never manage @everyone.
        if (role.id === guild.id) continue;

        // ASTER cannot manage roles at or above its highest role.
        if (role.position >= me.roles.highest.position) continue;

        const hasRole = member.roles.cache.has(role.id);

        const threshold = Number(reward.threshold);

        const shouldHave =
            reward.enabled === 1 &&
            Number.isFinite(threshold) &&
            user.reputation >= threshold;

        if (shouldHave && !hasRole) {
            await member.roles.add(role).catch(() => {});
        }

        if (!shouldHave && hasRole) {
            await member.roles.remove(role).catch(() => {});
        }
    }
}

module.exports = {
    syncRepRewards
};