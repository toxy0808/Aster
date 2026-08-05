const db = require("./database");

db.prepare(`
CREATE TABLE IF NOT EXISTS leaderboard_messages (
    type TEXT PRIMARY KEY,
    message_id TEXT
)
`).run();

module.exports = db;