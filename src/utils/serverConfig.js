const db = require("../database/database");

function getConfig(guildId) {

    if (!guildId) {
        return null;
    }

    let config = db.prepare(`
        SELECT *
        FROM server_config
        WHERE guild_id = ?
    `).get(guildId);

    if (!config) {

        db.prepare(`
            INSERT INTO server_config (
                guild_id,
                log_channel
            )
            VALUES (?, NULL)
        `).run(guildId);

        config = db.prepare(`
            SELECT *
            FROM server_config
            WHERE guild_id = ?
        `).get(guildId);
    }

    return config;
}


// ========================================================
// SET LOG CHANNEL
// ========================================================

function setLogChannel(guildId, channelId) {

    if (!guildId || !channelId) {
        return false;
    }

    db.prepare(`
        INSERT INTO server_config (
            guild_id,
            log_channel
        )
        VALUES (?, ?)
        ON CONFLICT(guild_id)
        DO UPDATE SET
            log_channel = excluded.log_channel
    `).run(
        guildId,
        channelId
    );

    return true;
}


module.exports = {
    getConfig,
    setLogChannel
};