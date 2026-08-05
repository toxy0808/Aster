const db = require("../database/database");

function getConfig(guildId) {

    let config = db.prepare(
        "SELECT * FROM server_config WHERE guild_id = ?"
    ).get(guildId);

    if (!config) {

        db.prepare(`
            INSERT INTO server_config
            (guild_id)
            VALUES (?)
        `).run(guildId);

        config = db.prepare(
            "SELECT * FROM server_config WHERE guild_id = ?"
        ).get(guildId);

    }

    return config;
}

module.exports = {
    getConfig
};