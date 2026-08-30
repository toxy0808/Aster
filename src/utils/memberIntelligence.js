const db = require("../database/database");

// ========================================================
// ASTER — MEMBER INTELLIGENCE
// ========================================================

function getMemberIntelligence(guildId, userId) {

    // ====================================================
    // TOTAL CHAT
    // ====================================================

    const chat = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM activity_logs
        WHERE user_id = ?
        AND type = 'chat'
    `).get(userId).total;

    // ====================================================
    // TOTAL VOICE
    // ====================================================

    const voice = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM activity_logs
        WHERE user_id = ?
        AND type = 'voice'
    `).get(userId).total;

    // ====================================================
    // LAST 7 DAYS CHAT
    // ====================================================

    const recentChat = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM activity_logs
        WHERE user_id = ?
        AND type = 'chat'
        AND created_at >= datetime('now', '-7 days')
    `).get(userId).total;

    // ====================================================
    // LAST 7 DAYS VOICE
    // ====================================================

    const recentVoice = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM activity_logs
        WHERE user_id = ?
        AND type = 'voice'
        AND created_at >= datetime('now', '-7 days')
    `).get(userId).total;

    // ====================================================
    // SERVER CHAT TOTAL
    // ====================================================

    const serverChat = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM activity_logs
        WHERE type = 'chat'
    `).get().total;

    // ====================================================
    // SERVER VOICE TOTAL
    // ====================================================

    const serverVoice = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM activity_logs
        WHERE type = 'voice'
    `).get().total;

    // ====================================================
    // ACTIVITY PERCENTAGES
    // ====================================================

    const chatPercentage =
        serverChat > 0
            ? Math.min(
                100,
                Math.round((chat / serverChat) * 100)
            )
            : 0;

    const voicePercentage =
        serverVoice > 0
            ? Math.min(
                100,
                Math.round((voice / serverVoice) * 100)
            )
            : 0;

    // ====================================================
    // ACTIVITY SCORE
    // ====================================================

    const chatScore =
        Math.min(chat / 10, 50);

    const voiceScore =
        Math.min(voice / 3600, 50);

    const activityScore =
        Math.min(
            100,
            Math.round(chatScore + voiceScore)
        );

    // ====================================================
    // ENGAGEMENT LEVEL
    // ====================================================

    let engagement;

    if (activityScore >= 80) {
        engagement = "Elite";
    } else if (activityScore >= 60) {
        engagement = "High";
    } else if (activityScore >= 30) {
        engagement = "Moderate";
    } else {
        engagement = "Low";
    }

    // ====================================================
    // RECENT ACTIVITY
    // ====================================================

    const recentActivity =
        recentChat + recentVoice;

    // ====================================================
    // RETURN
    // ====================================================

    return {
        chat,
        voice,

        recentChat,
        recentVoice,
        recentActivity,

        chatPercentage,
        voicePercentage,

        activityScore,
        engagement
    };
}

module.exports = {
    getMemberIntelligence
};