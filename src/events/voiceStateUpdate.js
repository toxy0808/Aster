console.log("VOICE EVENT FIRED");
const db = require("../database/database");
const activityDB = require("../database/activityLogs");
const activeVoiceUsers = new Map();

global.activeVoiceUsers = activeVoiceUsers;


module.exports = async (oldState, newState) => {

    const member = newState.member || oldState.member;

    if (!member) return;


    const userId = member.id;



    // User joined a voice channel

    if (!oldState.channelId && newState.channelId) {

        const micOpen =
            !newState.selfMute;


        if (!micOpen) return;


        activeVoiceUsers.set(
userId,
{
lastUnmutedAt: Date.now(),
activeMinutes: 0,
camera: newState.selfVideo,
muted: false
}
);

        return;
    }



    // User changed camera/mic status

    if (
        oldState.channelId &&
        newState.channelId
    ) {

        const session =
            activeVoiceUsers.get(userId);


        if (!session) return;


        session.camera =
            newState.selfVideo;

if (newState.selfMute && !session.muted) {

    if (session.lastUnmutedAt) {
        session.activeMinutes += Math.floor(
            (Date.now() - session.lastUnmutedAt) / 60000
        );
    }

    session.muted = true;
}


if (!newState.selfMute && session.muted) {

    session.lastUnmutedAt = Date.now();
    session.muted = false;

}
        return;
    }



    // User left voice channel

    if (
        oldState.channelId &&
        !newState.channelId
    ) {


        const session =
            activeVoiceUsers.get(userId);


        if (!session) return;



      if (!session.muted && session.lastUnmutedAt) {

    session.activeMinutes += Math.floor(
        (Date.now() - session.lastUnmutedAt) / 60000
    );

}

const minutes = session.activeMinutes;

        if (minutes <= 0) {
    activeVoiceUsers.delete(userId);
    return;
}

db.prepare(`
INSERT INTO users (user_id)
VALUES (?)
ON CONFLICT(user_id) DO NOTHING
`).run(userId);

db.prepare(`
UPDATE users
SET voice_time = voice_time + ?
WHERE user_id = ?
`).run(
    minutes,
    userId
);

activityDB.prepare(
    "INSERT INTO activity_logs (user_id, type, amount) VALUES (?, ?, ?)"
).run(
    userId,
    "voice",
    minutes
);

console.log(
`${member.user.username} gained ${minutes} active VC minutes`
);

activeVoiceUsers.delete(userId);

} // <-- leave block closes here
};