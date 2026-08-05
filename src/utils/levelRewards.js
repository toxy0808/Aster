function getLevelReward(level) {

    const rewards = {
        5: "⭐ Active Member role",
        10: "🔥 Rising Star role",
        25: "💎 Veteran role",
        50: "👑 Elite role"
    };

    return rewards[level] || null;
}

module.exports = { getLevelReward };