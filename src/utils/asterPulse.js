const db = require("../database/database");

let pulseInterval = null;

function getPulseData(guild) {

    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);

    // =========================
    // CHAT ACTIVITY
    // =========================

    const chat = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM activity_logs
        WHERE type = 'chat'
        AND created_at >= ?
    `).get(fiveMinutesAgo);

    const messages = Number(chat?.total || 0);

    const messagesPerMinute =
        Math.round(messages / 5);


    // =========================
    // VOICE ACTIVITY
    // =========================

    let voiceUsers = 0;

    for (const channel of guild.channels.cache.values()) {

        if (!channel.isVoiceBased()) {
            continue;
        }

        for (const member of channel.members.values()) {

            // Only count members with an active microphone
            if (
                member.user.bot ||
                member.voice.selfMute ||
                member.voice.serverMute
            ) {
                continue;
            }

            voiceUsers++;
        }
    }


    // =========================
    // ACTIVITY SCORE
    // =========================

    const score =
        messagesPerMinute +
        (voiceUsers * 2);


    // =========================
    // STATE
    // =========================

    let state;

    if (score >= 40) {
        state = "PEAK";
    } else if (score >= 20) {
        state = "BUSY";
    } else if (score >= 5) {
        state = "ACTIVE";
    } else {
        state = "CALM";
    }

    return {
        state,
        messagesPerMinute,
        voiceUsers,
        score
    };
}


function updatePresence(client) {

    const guild = client.guilds.cache.first();

    if (!guild) {
        return;
    }

    const pulse = getPulseData(guild);

    let activity;

    switch (pulse.state) {

        case "PEAK":
            activity = "PEAK ACTIVITY";
            break;

        case "BUSY":
            activity = `${pulse.voiceUsers} IN VOICE`;
            break;

        case "ACTIVE":
            activity = `${pulse.messagesPerMinute} MSG/MIN`;
            break;

        default:
            activity = "CALM";
            break;
    }

    client.user.setPresence({
        status: "online",
        activities: [
            {
                name: `ASTER • ${activity}`,
                type: 3
            }
        ]
    });

    return pulse;
}


function startPulse(client) {

    if (pulseInterval) {
        clearInterval(pulseInterval);
    }

    // Initial update
    updatePresence(client);

    // Update once per minute
    pulseInterval = setInterval(() => {
        updatePresence(client);
    }, 60 * 1000);

    console.log("ASTER PULSE SYSTEM LOADED");
}


module.exports = {
    getPulseData,
    updatePresence,
    startPulse
};