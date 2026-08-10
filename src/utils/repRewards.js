const db = require("../database/database");

async function syncRepRewards(guild, userId) {
    const user = db.prepare(
        "SELECT reputation FROM reputation WHERE user_id = ?"
    ).get(userId);

    if (!user) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    const rewards = db.prepare(`
        SELECT role_id, threshold, enabled
        FROM reputation_rewards
        WHERE guild_id = ?
    `).all(guild.id);

    for (const reward of rewards) {
        const role = guild.roles.cache.get(reward.role_id);
        if (!role) continue;

        const hasRole = member.roles.cache.has(role.id);
        const shouldHave =
            reward.enabled === 1 &&
            user.reputation >= reward.threshold;

        if (shouldHave && !hasRole)
            await member.roles.add(role).catch(() => {});

        if (!shouldHave && hasRole)
            await member.roles.remove(role).catch(() => {});
    }
}

module.exports = { syncRepRewards };