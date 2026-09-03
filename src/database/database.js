const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(
    path.join(__dirname, "../../aster.db")
);

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

const serverConfigColumns = [
    ["rep_staff_role", "TEXT"],
    ["rep_funder_role", "TEXT"],
    ["rep_member_limit", "INTEGER DEFAULT 3"],
    ["rep_staff_limit", "INTEGER DEFAULT 5"],
    ["rep_funder_limit", "INTEGER DEFAULT 8"],
    ["rep_staff_funder_limit", "INTEGER DEFAULT 10"]
];

for (const [column, type] of serverConfigColumns) {
    try {
        db.prepare(
            `ALTER TABLE server_config ADD COLUMN ${column} ${type}`
        ).run();
    } catch {}
}


// =========================
// USERS
// =========================

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    messages INTEGER DEFAULT 0,
    voice_time INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1
)
`);


// =========================
// ACTIVITY LOGS
// =========================

db.exec(`
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);


// =========================
// REPUTATION
// =========================

db.exec(`
CREATE TABLE IF NOT EXISTS reputation (
    user_id TEXT PRIMARY KEY,
    reputation INTEGER DEFAULT 0,
    daily_given INTEGER DEFAULT 0,
    daily_reset INTEGER DEFAULT 0
)
`);

try {
    db.prepare(`
        ALTER TABLE reputation
        ADD COLUMN reputation INTEGER DEFAULT 0
    `).run();
} catch {}

try {
    db.prepare(`
        UPDATE reputation
        SET reputation = positive - negative
        WHERE reputation = 0
    `).run();
} catch {}


// =========================
// REPUTATION LOGS
// =========================

db.exec(`
CREATE TABLE IF NOT EXISTS reputation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    giver_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);


// =========================
// REPUTATION REWARDS
// =========================

db.exec(`
CREATE TABLE IF NOT EXISTS reputation_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    threshold INTEGER NOT NULL,
    type TEXT DEFAULT 'positive',
    enabled INTEGER DEFAULT 1
)
`);


// =========================
// EXPORT
// =========================

module.exports = db;