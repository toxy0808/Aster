const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "../../aster.db"));

/* =========================================================
   SQLITE PERFORMANCE
========================================================= */

db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

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

/* backwards-compatible server_config columns */
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

db.prepare(`
    CREATE TABLE IF NOT EXISTS rep_role_limits (
        guild_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        bonus INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, role_id)
    )
`).run();

/* =========================================================
   LEGACY REP CONFIG MIGRATION
========================================================= */

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

            if (config.rep_staff_role) {
                const staffLimit = Number.isInteger(
                    Number(config.rep_staff_limit)
                )
                    ? Math.max(0, Number(config.rep_staff_limit))
                    : 5;

                const staffBonus = Math.max(0, staffLimit - base);

                insertRoleBonus.run(
                    config.guild_id,
                    config.rep_staff_role,
                    staffBonus
                );
            }

            if (config.rep_funder_role) {
                const funderLimit = Number.isInteger(
                    Number(config.rep_funder_limit)
                )
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
        voice_time INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        last_message INTEGER DEFAULT 0,
        last_voice INTEGER DEFAULT 0
    )
`).run();

/* =========================================================
   USERS VOICE-TIME MIGRATION
========================================================= */

/*
 * Older versions of the schema used voice_seconds.
 *
 * The rest of ASTER currently uses voice_time in MINUTES,
 * so migrate the old column into the field used by the bot.
 */
try {
    const userColumns = db.prepare(`
        PRAGMA table_info(users)
    `).all();

    const hasVoiceTime = userColumns.some(
        (column) => column.name === "voice_time"
    );

    const hasVoiceSeconds = userColumns.some(
        (column) => column.name === "voice_seconds"
    );

    if (!hasVoiceTime) {
        db.prepare(`
            ALTER TABLE users
            ADD COLUMN voice_time INTEGER DEFAULT 0
        `).run();
    }

    if (hasVoiceSeconds) {
        db.prepare(`
            UPDATE users
            SET voice_time = COALESCE(voice_time, 0)
                + COALESCE(voice_seconds, 0)
            WHERE COALESCE(voice_seconds, 0) != 0
        `).run();

        /*
         * Prevent the migration from being applied twice if the bot
         * restarts before the old column is removed.
         */
        db.prepare(`
            UPDATE users
            SET voice_seconds = 0
            WHERE COALESCE(voice_seconds, 0) != 0
        `).run();
    }
} catch (error) {
    console.error(
        "[ASTER] Failed to migrate users voice-time column:",
        error
    );
}

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
   ACTIVITY LOG PERFORMANCE INDEXES
========================================================= */

db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_activity_logs_type_created_at
    ON activity_logs(type, created_at)
`).run();

db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user_type_created_at
    ON activity_logs(user_id, type, created_at)
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

/* =========================================================
   LEGACY REPUTATION MIGRATION
========================================================= */

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