const Database = require("better-sqlite3");

const db = new Database("aster.db");

// =========================
// SERVER CONFIG
// =========================

db.exec(`
CREATE TABLE IF NOT EXISTS server_config (
    guild_id TEXT PRIMARY KEY,
    leaderboard_channel TEXT,
    chat_king_role TEXT,
    voice_king_role TEXT,
    welcome_channel TEXT,
    log_channel TEXT,
    rep_staff_role TEXT,
    rep_funder_role TEXT,
    rep_member_limit INTEGER DEFAULT 3,
    rep_staff_limit INTEGER DEFAULT 5,
    rep_funder_limit INTEGER DEFAULT 8,
    rep_staff_funder_limit INTEGER DEFAULT 10
)
`);

// =========================
// ACTIVITY LOGS
// =========================

db.prepare(`
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    type TEXT,
    amount INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

// =========================
// REPUTATION
// =========================

db.prepare(`
CREATE TABLE IF NOT EXISTS reputation (
    user_id TEXT PRIMARY KEY,
    positive INTEGER DEFAULT 0,
    negative INTEGER DEFAULT 0,
    daily_given INTEGER DEFAULT 0,
    daily_reset INTEGER DEFAULT 0
)
`).run();

// =========================
// REPUTATION LOGS
// =========================

db.prepare(`
CREATE TABLE IF NOT EXISTS reputation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    giver_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

module.exports = db;