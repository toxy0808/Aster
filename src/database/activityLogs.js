const db = require("./database");

db.prepare(`
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
)
`).run();

module.exports = db;