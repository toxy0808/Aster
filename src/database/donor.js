const db = require("./database");

// ============================================================
// DONOR DATABASE
// ============================================================

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function addColumnIfMissing(table, column, definition) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();

    if (!columns.some((col) => col.name === column)) {
        db.prepare(
            `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
        ).run();
    }
}

// ------------------------------------------------------------
// Tables
// ------------------------------------------------------------

db.prepare(`
    CREATE TABLE IF NOT EXISTS donor_settings (
        guild_id TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 1,
        kofi_url TEXT DEFAULT '',
        announcement_channel_id TEXT,
        log_channel_id TEXT,
        announcements_enabled INTEGER DEFAULT 1,
        logging_enabled INTEGER DEFAULT 1,
        announcement_message TEXT DEFAULT 'Thank you {user} for supporting ASTER! 💜',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS donor_tiers (
        guild_id TEXT NOT NULL,
        tier_id TEXT NOT NULL,
        role_id TEXT,
        amount INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (guild_id, tier_id)
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        donor_id TEXT,
        donor_name TEXT,
        amount INTEGER DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        tier_id TEXT,
        kofi_transaction_id TEXT,
        message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// ------------------------------------------------------------
// Migrations for existing databases
// ------------------------------------------------------------

addColumnIfMissing(
    "donor_settings",
    "enabled",
    "INTEGER DEFAULT 1"
);

addColumnIfMissing(
    "donor_settings",
    "kofi_url",
    "TEXT DEFAULT ''"
);

addColumnIfMissing(
    "donor_settings",
    "announcement_channel_id",
    "TEXT"
);

addColumnIfMissing(
    "donor_settings",
    "log_channel_id",
    "TEXT"
);

addColumnIfMissing(
    "donor_settings",
    "announcements_enabled",
    "INTEGER DEFAULT 1"
);

addColumnIfMissing(
    "donor_settings",
    "logging_enabled",
    "INTEGER DEFAULT 1"
);

addColumnIfMissing(
    "donor_settings",
    "announcement_message",
    "TEXT DEFAULT 'Thank you {user} for supporting ASTER! 💜'"
);

addColumnIfMissing(
    "donor_settings",
    "created_at",
    "TEXT"
);

addColumnIfMissing(
    "donor_settings",
    "updated_at",
    "TEXT"
);

addColumnIfMissing(
    "donor_tiers",
    "enabled",
    "INTEGER DEFAULT 1"
);

addColumnIfMissing(
    "donor_tiers",
    "created_at",
    "TEXT"
);

addColumnIfMissing(
    "donor_tiers",
    "updated_at",
    "TEXT"
);

// ------------------------------------------------------------
// Settings
// ------------------------------------------------------------

function getSettings(guildId) {
    guildId = String(guildId);

    let settings = db.prepare(`
        SELECT *
        FROM donor_settings
        WHERE guild_id = ?
    `).get(guildId);

    if (!settings) {
        db.prepare(`
            INSERT INTO donor_settings (
                guild_id,
                enabled,
                kofi_url,
                announcement_channel_id,
                log_channel_id,
                announcements_enabled,
                logging_enabled,
                announcement_message,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                1,
                '',
                NULL,
                NULL,
                1,
                1,
                ?,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
        `).run(
            guildId,
            "Thank you {user} for supporting ASTER! 💜"
        );

        settings = db.prepare(`
            SELECT *
            FROM donor_settings
            WHERE guild_id = ?
        `).get(guildId);
    }

    return settings;
}

function updateSettings(guildId, updates = {}) {
    guildId = String(guildId);

    getSettings(guildId);

    const allowed = [
        "enabled",
        "kofi_url",
        "announcement_channel_id",
        "log_channel_id",
        "announcements_enabled",
        "logging_enabled",
        "announcement_message"
    ];

    const entries = Object.entries(updates).filter(
        ([key]) => allowed.includes(key)
    );

    if (!entries.length) {
        return getSettings(guildId);
    }

    const setClause = entries
        .map(([key]) => `${key} = ?`)
        .join(", ");

    const values = entries.map(([, value]) => value);

    db.prepare(`
        UPDATE donor_settings
        SET ${setClause},
            updated_at = CURRENT_TIMESTAMP
        WHERE guild_id = ?
    `).run(...values, guildId);

    return getSettings(guildId);
}

function resetSettings(guildId) {
    guildId = String(guildId);

    db.prepare(`
        DELETE FROM donor_settings
        WHERE guild_id = ?
    `).run(guildId);

    return getSettings(guildId);
}

// ------------------------------------------------------------
// Tiers
// ------------------------------------------------------------

function setTier(guildId, tierId, roleId, amount) {
    guildId = String(guildId);
    tierId = String(tierId);
    roleId = roleId ? String(roleId) : null;
    amount = Number(amount) || 0;

    const existing = db.prepare(`
        SELECT *
        FROM donor_tiers
        WHERE guild_id = ?
        AND tier_id = ?
    `).get(guildId, tierId);

    if (existing) {
        db.prepare(`
            UPDATE donor_tiers
            SET
                role_id = ?,
                amount = ?,
                enabled = 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE guild_id = ?
            AND tier_id = ?
        `).run(
            roleId,
            amount,
            guildId,
            tierId
        );
    } else {
        db.prepare(`
            INSERT INTO donor_tiers (
                guild_id,
                tier_id,
                role_id,
                amount,
                enabled,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                ?,
                ?,
                ?,
                1,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
        `).run(
            guildId,
            tierId,
            roleId,
            amount
        );
    }

    return db.prepare(`
        SELECT *
        FROM donor_tiers
        WHERE guild_id = ?
        AND tier_id = ?
    `).get(guildId, tierId);
}

function removeTier(guildId, tierId) {
    guildId = String(guildId);
    tierId = String(tierId);

    return db.prepare(`
        DELETE FROM donor_tiers
        WHERE guild_id = ?
        AND tier_id = ?
    `).run(guildId, tierId);
}

function getTier(guildId, tierId) {
    return db.prepare(`
        SELECT *
        FROM donor_tiers
        WHERE guild_id = ?
        AND tier_id = ?
    `).get(
        String(guildId),
        String(tierId)
    );
}

function listTiers(guildId) {
    return db.prepare(`
        SELECT *
        FROM donor_tiers
        WHERE guild_id = ?
        ORDER BY amount ASC, tier_id ASC
    `).all(String(guildId));
}

function toggleTier(guildId, tierId) {
    guildId = String(guildId);
    tierId = String(tierId);

    db.prepare(`
        UPDATE donor_tiers
        SET
            enabled = CASE
                WHEN enabled = 1 THEN 0
                ELSE 1
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE guild_id = ?
        AND tier_id = ?
    `).run(guildId, tierId);

    return getTier(guildId, tierId);
}

// ------------------------------------------------------------
// Donations
// ------------------------------------------------------------

function addDonation({
    guildId,
    donorId = null,
    donorName = null,
    amount = 0,
    currency = "USD",
    tierId = null,
    kofiTransactionId = null,
    message = null
}) {
    const result = db.prepare(`
        INSERT INTO donations (
            guild_id,
            donor_id,
            donor_name,
            amount,
            currency,
            tier_id,
            kofi_transaction_id,
            message
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        guildId ? String(guildId) : null,
        donorId ? String(donorId) : null,
        donorName,
        Number(amount) || 0,
        currency,
        tierId ? String(tierId) : null,
        kofiTransactionId,
        message
    );

    return db.prepare(`
        SELECT *
        FROM donations
        WHERE id = ?
    `).get(result.lastInsertRowid);
}

function getDonationByTransactionId(transactionId) {
    if (!transactionId) return null;

    return db.prepare(`
        SELECT *
        FROM donations
        WHERE kofi_transaction_id = ?
        LIMIT 1
    `).get(String(transactionId));
}

function listDonations(guildId, limit = 25) {
    return db.prepare(`
        SELECT *
        FROM donations
        WHERE guild_id = ?
        ORDER BY id DESC
        LIMIT ?
    `).all(
        String(guildId),
        Number(limit) || 25
    );
}

// ------------------------------------------------------------
// Statistics
// ------------------------------------------------------------

function getDonationStats(guildId) {
    guildId = String(guildId);

    const stats = db.prepare(`
        SELECT
            COUNT(*) AS donation_count,
            COALESCE(SUM(amount), 0) AS total_amount
        FROM donations
        WHERE guild_id = ?
    `).get(guildId);

    return {
        donationCount: Number(stats?.donation_count || 0),
        totalAmount: Number(stats?.total_amount || 0)
    };
}

// ------------------------------------------------------------
// Formatting
// ------------------------------------------------------------

function formatUSD(cents) {
    return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function formatTierAmount(amount) {
    return `$${Number(amount || 0).toFixed(0)}`;
}

// ------------------------------------------------------------
// Exports
// ------------------------------------------------------------

module.exports = {
    getSettings,
    updateSettings,
    resetSettings,

    setTier,
    removeTier,
    getTier,
    listTiers,
    toggleTier,

    addDonation,
    getDonationByTransactionId,
    listDonations,

    getDonationStats,

    formatUSD,
    formatTierAmount
};