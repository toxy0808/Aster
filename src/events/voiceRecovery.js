const activeVoiceUsers = global.activeVoiceUsers || new Map();
global.activeVoiceUsers = activeVoiceUsers;

module.exports = (client) => {
    let recovered = 0;

    for (const guild of client.guilds.cache.values()) {

        for (const channel of guild.channels.cache.values()) {

            if (!channel.isVoiceBased()) continue;

            for (const member of channel.members.values()) {

                if (member.user.bot) continue;

                activeVoiceUsers.set(member.id, {
                    joinedAt: Date.now(),
                    camera: member.voice.selfVideo,
                    minutes: 0,
                    muted: member.voice.selfMute
                });

                recovered++;
            }
        }
    }

    if (recovered > 0) {
        console.log(`Recovered ${recovered} VC sessions`);
    }
};