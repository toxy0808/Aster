const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "../../aster.db"));

/* =========================================================
   SERVER CONFIG
========================================================= */

db.prepare(`
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
`).run();

/*
 * Backwards-compatible schema upgrades.
 * These are intentionally kept because older Aster databases
 * may already have the server_config table without all of
 * these columns.
 */
const serverConfigColumns = [
    ["leaderboard_channel", "TEXT"],
    ["chat_king_role", "TEXT"],
    ["voice_king_role", "TEXT"],
    ["welcome_channel", "TEXT"],
    ["log_channel", "TEXT"],

    ["rep_staff_role", "TEXT"],
    ["rep_funder_role", "TEXT"],

    ["rep_member_limit", "INTEGER DEFAULT 3"],
    ["rep_staff_limit", "INTEGER DEFAULT 5"],
    ["rep_funder_limit", "INTEGER DEFAULT 8"],
    ["rep_staff_funder_limit", "INTEGER DEFAULT 10"]
];

for (const [column, definition] of serverConfigColumns) {
    try {
        db.prepare(
            `ALTER TABLE server_config ADD COLUMN ${column} ${definition}`
        ).run();
    } catch {
        // Column already exists.
    }
}

/* =========================================================
   REP ROLE DAILY-LIMIT BONUSES
========================================================= */

/*
 * New additive reputation daily-limit system.
 *
 * Each guild can configure one bonus per Discord role.
 *
 * Example:
 *   base = 3
 *   Booster = +2
 *   Staff   = +2
 *   Donor   = +2
 *
 * A member with all three roles gets:
 *   3 + 2 + 2 + 2 = 9
 */
db.prepare(`
    CREATE TABLE IF NOT EXISTS rep_role_limits (
        guild_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        bonus INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, role_id)
    )
`).run();

/*
 * One-time migration from the old Staff/Funder tier system.
 *
 * Old defaults:
 *   Member       = 3
 *   Staff        = 5  -> +2
 *   Funder       = 8  -> +5
 *   Staff+Funder = 10
 *
 * Therefore the old default configuration becomes:
 *   Base   = 3
 *   Staff  = +2
 *   Funder = +5
 *
 * INSERT OR IGNORE means an administrator's new-style
 * configuration is never overwritten.
 */
try {
    const legacyRepConfigs = db.prepare(`
        SELECT
            guild_id,
            rep_staff_role,
            rep_funder_role,
            rep_member_limit,
            rep_staff_limit,
            rep_funder_limit
        FROM server_config
    `).all();

    const insertRoleBonus = db.prepare(`
        INSERT OR IGNORE INTO rep_role_limits (
            guild_id,
            role_id,
            bonus
        )
        VALUES (?, ?, ?)
    `);

    const migrateLegacyRepConfig = db.transaction((configs) => {
        for (const config of configs) {
            const base = Number.isInteger(Number(config.rep_member_limit))
                ? Math.max(0, Number(config.rep_member_limit))
                : 3;

            /*
             * Convert the old Staff limit into an additive bonus.
             */
            if (config.rep_staff_role) {
                const staffLimit = Number.isInteger(Number(config.rep_staff_limit))
                    ? Math.max(0, Number(config.rep_staff_limit))
                    : 5;

                const staffBonus = Math.max(0, staffLimit - base);

                insertRoleBonus.run(
                    config.guild_id,
                    config.rep_staff_role,
                    staffBonus
                );
            }

            /*
             * Convert the old Funder limit into an additive bonus.
             */
            if (config.rep_funder_role) {
                const funderLimit = Number.isInteger(Number(config.rep_funder_limit))
                    ? Math.max(0, Number(config.rep_funder_limit))
                    : 8;

                const funderBonus = Math.max(0, funderLimit - base);

                insertRoleBonus.run(
                    config.guild_id,
                    config.rep_funder_role,
                    funderBonus
                );
            }
        }
    });

    migrateLegacyRepConfig(legacyRepConfigs);
} catch (error) {
    console.error(
        "[ASTER] Failed to migrate legacy reputation limits:",
        error
    );
}

/* =========================================================
   USERS
========================================================= */

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        username TEXT,
        messages INTEGER DEFAULT 0,
        voice_seconds INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        last_message INTEGER DEFAULT 0,
        last_voice INTEGER DEFAULT 0
    )
`).run();

/* =========================================================
   ACTIVITY LOGS
========================================================= */

db.prepare(`
    CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
`).run();

/* =========================================================
   REPUTATION
========================================================= */

db.prepare(`
    CREATE TABLE IF NOT EXISTS reputation (
        user_id TEXT PRIMARY KEY,
        reputation INTEGER DEFAULT 0,
        daily_given INTEGER DEFAULT 0,
        daily_reset INTEGER DEFAULT 0
    )
`).run();

/*
 * Legacy compatibility.
 *
 * Older versions of Aster may have stored positive/negative
 * reputation values instead of the current single reputation
 * column. Keep the existing migration behavior intact.
 */
try {
    db.prepare(`
        ALTER TABLE reputation ADD COLUMN reputation INTEGER DEFAULT 0
    `).run();
} catch {
    // Column already exists.
}

try {
    db.prepare(`
        UPDATE reputation
        SET reputation = positive - negative
        WHERE reputation = 0
          AND positive IS NOT NULL
          AND negative IS NOT NULL
    `).run();
} catch {
    // Legacy positive/negative columns do not exist.
}

/* =========================================================
   REPUTATION LOGS
========================================================= */

db.prepare(`
    CREATE TABLE IF NOT EXISTS reputation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        giver_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`).run();

/* =========================================================
   REPUTATION REWARDS
========================================================= */

db.prepare(`
    CREATE TABLE IF NOT EXISTS reputation_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        threshold INTEGER NOT NULL,
        type TEXT NOT NULL,
        enabled INTEGER DEFAULT 1
    )
`).run();

module.exports = db;