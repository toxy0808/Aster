const db = require("../database/database");
const activityDB = require("../database/activityLogs");

const activeVoiceUsers =
    global.activeVoiceUsers || new Map();

global.activeVoiceUsers = activeVoiceUsers;

/* =========================================================
   PREPARED VOICE STATEMENTS
========================================================= */

const ensureUser = db.prepare(`
    INSERT INTO users (user_id)
    VALUES (?)
    ON CONFLICT(user_id) DO NOTHING
`);

const updateVoiceTime = db.prepare(`
    UPDATE users
    SET voice_time = voice_time + ?
    WHERE user_id = ?
`);

const insertVoiceActivity = activityDB.prepare(`
    INSERT INTO activity_logs
        (user_id, type, amount)
    VALUES (?, 'voice', ?)
`);

/* =========================================================
   ATOMIC VOICE DATABASE UPDATE
========================================================= */

const saveVoiceActivity = db.transaction((userId, minutes) => {
    ensureUser.run(userId);
    updateVoiceTime.run(minutes, userId);
    insertVoiceActivity.run(userId, minutes);
});

/* =========================================================
   VOICE STATE UPDATE
========================================================= */

module.exports = async (oldState, newState) => {
    const member = newState.member || oldState.member;

    if (!member) return;

    const userId = member.id;

    /* =====================================================
       USER JOINED VOICE
    ===================================================== */

    if (!oldState.channelId && newState.channelId) {
        activeVoiceUsers.set(userId, {
            lastUnmutedAt: newState.selfMute
                ? null
                : Date.now(),

            activeMinutes: 0,
            camera: newState.selfVideo,
            muted: newState.selfMute
        });

        return;
    }

    /* =====================================================
       USER CHANGED CAMERA / MIC STATUS
    ===================================================== */

    if (oldState.channelId && newState.channelId) {
        const session = activeVoiceUsers.get(userId);

        if (!session) return;

        session.camera = newState.selfVideo;

        /* User muted */
        if (newState.selfMute && !session.muted) {
            if (session.lastUnmutedAt) {
                session.activeMinutes += Math.floor(
                    (Date.now() - session.lastUnmutedAt) / 60000
                );
            }

            session.muted = true;
        }

        /* User unmuted */
        if (!newState.selfMute && session.muted) {
            session.lastUnmutedAt = Date.now();
            session.muted = false;
        }

        return;
    }

    /* =====================================================
       USER LEFT VOICE
    ===================================================== */

    if (oldState.channelId && !newState.channelId) {
        const session = activeVoiceUsers.get(userId);

        if (!session) return;

        /* Add final unmuted time */
        if (!session.muted && session.lastUnmutedAt) {
            session.activeMinutes += Math.floor(
                (Date.now() - session.lastUnmutedAt) / 60000
            );
        }

        const minutes = session.activeMinutes;

        /* Nothing to record */
        if (minutes <= 0) {
            activeVoiceUsers.delete(userId);
            return;
        }

        try {
            saveVoiceActivity(userId, minutes);
        } catch (error) {
            console.error(
                "[ASTER] VOICE ACTIVITY ERROR:",
                error.stack || error
            );
        }

        activeVoiceUsers.delete(userId);
    }
};