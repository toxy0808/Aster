const Database = require("better-sqlite3");

const db = new Database("aster.db");

db.exec(`
CREATE TABLE IF NOT EXISTS server_config (
    guild_id TEXT PRIMARY KEY,
    leaderboard_channel TEXT,
    chat_king_role TEXT,
    voice_king_role TEXT
)
`);

db.prepare(`
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    type TEXT,
    amount INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS server_config (
    guild_id TEXT PRIMARY KEY,
    leaderboard_channel TEXT,
    chat_king_role TEXT,
    voice_king_role TEXT,
    welcome_channel TEXT,
    log_channel TEXT
)
`).run();

module.exports = db;