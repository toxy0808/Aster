const db = require("../database/database");

async function updateRepRewards(member) {

    const rep = db.prepare(`
        SELECT positive, negative
        FROM reputation
        WHERE user_id = ?
    `).get(member.id);

    if (!rep) return;

    const net = rep.positive - rep.negative;

    const rewards = db.prepare(`
        SELECT role_id, threshold, type, enabled
        FROM reputation_rewards
        WHERE guild_id = ?
        AND enabled = 1
    `).all(member.guild.id);

    for (const reward of rewards) {

        const value =
            reward.type === "negative"
                ? rep.negative
                : net;

        const role = member.guild.roles.cache.get(
            reward.role_id
        );

        if (!role) continue;

        if (value >= reward.threshold) {
            if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role).catch(() => {});
            }
        } else {
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role).catch(() => {});
            }
        }
    }
}

module.exports = {
    updateRepRewards
};