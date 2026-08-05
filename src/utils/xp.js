function getXPData(user) {
    const level = user.level;
    const xp = user.xp;

    const currentLevelXP = Math.pow(level - 1, 2) * 100;
const nextLevelXP = Math.pow(level, 2) * 100;

    const currentXP = xp - currentLevelXP;
    const neededXP = nextLevelXP - currentLevelXP;

    const percent = Math.floor((currentXP / neededXP) * 100);

    return {
        level,
        xp,
        currentXP,
        neededXP,
        percent
    };
}

module.exports = { getXPData };