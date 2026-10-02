// ========================================================
// ASTER DONOR SYSTEM — DATABASE LAYER
// Ko-fi / provider agnostic
// ========================================================

const crypto = require("crypto");
const db = require("./database");

// --------------------------------------------------------
// SCHEMA
// --------------------------------------------------------

function ensureDonorSchema() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS donor_settings (
            guild_id TEXT PRIMARY KEY,
            enabled INTEGER NOT NULL DEFAULT 0,
            provider TEXT NOT NULL DEFAULT 'kofi',
            provider_url TEXT,
            announcement_channel_id TEXT,
            log_channel_id TEXT,
            announcements_enabled INTEGER NOT NULL DEFAULT 1,
            logging_enabled INTEGER NOT NULL DEFAULT 1,
            announcement_message TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS donor_tiers (
            guild_id TEXT NOT NULL,
            tier_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            amount INTEGER NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            PRIMARY KEY (guild_id, tier_id)
        );

        CREATE TABLE IF NOT EXISTS donations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            provider TEXT NOT NULL DEFAULT 'kofi',
            provider_transaction_id TEXT NOT NULL,
            donor_name TEXT,
            donor_email_hash TEXT,
            amount INTEGER NOT NULL,
            currency TEXT NOT NULL DEFAULT 'USD',
            message TEXT,
            tier_id TEXT,
            discord_user_id TEXT,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            UNIQUE(provider, provider_transaction_id)
        );

        CREATE INDEX IF NOT EXISTS idx_donations_guild_created
            ON donations(guild_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_donations_guild_user
            ON donations(guild_id, discord_user_id);

        CREATE INDEX IF NOT EXISTS idx_donations_guild_tier
            ON donations(guild_id, tier_id);
    `);

    const columns = db
        .prepare(`PRAGMA table_info(donor_tiers)`)
        .all();

    const names = new Set(
        columns.map(column => column.name)
    );

    const migrations = [
        ["enabled", "INTEGER NOT NULL DEFAULT 1"],
        ["created_at", "INTEGER DEFAULT (strftime('%s', 'now'))"],
        ["updated_at", "INTEGER DEFAULT (strftime('%s', 'now'))"]
    ];

    for (const [name, definition] of migrations) {
        if (names.has(name)) continue;

        try {
            db.prepare(
                `ALTER TABLE donor_tiers ADD COLUMN ${name} ${definition}`
            ).run();
        } catch (error) {
            if (
                !String(error?.message || "")
                    .toLowerCase()
                    .includes("duplicate column")
            ) {
                throw error;
            }
        }
    }
}

ensureDonorSchema();

// --------------------------------------------------------
// HELPERS
// --------------------------------------------------------

function normalizeTierId(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .slice(0, 32);
}

function centsFromAmount(value) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
        throw new TypeError(
            "Donation amount must be a non-negative number."
        );
    }

    return Math.round(number * 100);
}

function amountFromCents(value) {
    return (Number(value || 0) / 100).toFixed(2);
}

function hashEmail(email) {
    if (!email) return null;

    return crypto
        .createHash("sha256")
        .update(
            String(email)
                .trim()
                .toLowerCase()
        )
        .digest("hex");
}

// --------------------------------------------------------
// SETTINGS
// --------------------------------------------------------

function ensureSettings(guildId) {
    if (!guildId) {
        throw new TypeError("guildId is required.");
    }

    db.prepare(`
        INSERT OR IGNORE INTO donor_settings (guild_id)
        VALUES (?)
    `).run(String(guildId));

    return getSettings(guildId);
}

function getSettings(guildId) {
    return (
        db.prepare(`
            SELECT *
            FROM donor_settings
            WHERE guild_id = ?
        `).get(String(guildId)) || null
    );
}

function updateSettings(guildId, patch = {}) {
    ensureSettings(guildId);

    const allowed = new Set([
        "enabled",
        "provider",
        "provider_url",
        "announcement_channel_id",
        "log_channel_id",
        "announcements_enabled",
        "logging_enabled",
        "announcement_message"
    ]);

    const entries = Object.entries(patch)
        .filter(([key]) => allowed.has(key));

    if (!entries.length) {
        return getSettings(guildId);
    }

    const assignments = entries.map(
        ([key]) => `${key} = ?`
    );

    const values = entries.map(([key, value]) => {
        if (
            [
                "enabled",
                "announcements_enabled",
                "logging_enabled"
            ].includes(key)
        ) {
            return value ? 1 : 0;
        }

        return value ?? null;
    });

    db.prepare(`
        UPDATE donor_settings
        SET ${assignments.join(", ")},
            updated_at = strftime('%s', 'now')
        WHERE guild_id = ?
    `).run(
        ...values,
        String(guildId)
    );

    return getSettings(guildId);
}

// --------------------------------------------------------
// TIERS
// IMPORTANT: legacy donor tiers use whole USD values.
// Example: 5 = $5, NOT 500 cents.
// --------------------------------------------------------

function setTier(
    guildId,
    tierId,
    roleId,
    amount
) {
    const normalized = normalizeTierId(tierId);

    if (!normalized) {
        throw new TypeError("tierId is required.");
    }

    if (!roleId) {
        throw new TypeError("roleId is required.");
    }

    const dollars = Number(amount);

    if (
        !Number.isSafeInteger(dollars) ||
        dollars < 0
    ) {
        throw new TypeError(
            "Tier amount must be a whole USD amount."
        );
    }

    const existing = db.prepare(`
        SELECT guild_id
        FROM donor_tiers
        WHERE guild_id = ?
          AND tier_id = ?
    `).get(
        String(guildId),
        normalized
    );

    if (existing) {
        return db.prepare(`
            UPDATE donor_tiers
            SET role_id = ?,
                amount = ?,
                enabled = 1,
                updated_at = strftime('%s', 'now')
            WHERE guild_id = ?
              AND tier_id = ?
        `).run(
            String(roleId),
            dollars,
            String(guildId),
            normalized
        );
    }

    return db.prepare(`
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
            strftime('%s', 'now'),
            strftime('%s', 'now')
        )
    `).run(
        String(guildId),
        normalized,
        String(roleId),
        dollars
    );
}

function getTier(guildId, tierId) {
    return (
        db.prepare(`
            SELECT *
            FROM donor_tiers
            WHERE guild_id = ?
              AND tier_id = ?
        `).get(
            String(guildId),
            normalizeTierId(tierId)
        ) || null
    );
}

function removeTier(guildId, tierId) {
    return db.prepare(`
        DELETE FROM donor_tiers
        WHERE guild_id = ?
          AND tier_id = ?
    `).run(
        String(guildId),
        normalizeTierId(tierId)
    );
}

function listTiers(
    guildId,
    enabledOnly = false
) {
    return db.prepare(`
        SELECT *
        FROM donor_tiers
        WHERE guild_id = ?
        ${enabledOnly ? "AND enabled = 1" : ""}
        ORDER BY amount ASC, tier_id ASC
    `).all(String(guildId));
}

function getTierForAmount(
    guildId,
    amount
) {
    const dollars = Number(amount);

    if (!Number.isFinite(dollars)) {
        return null;
    }

    return (
        db.prepare(`
            SELECT *
            FROM donor_tiers
            WHERE guild_id = ?
              AND enabled = 1
              AND amount <= ?
            ORDER BY amount DESC
            LIMIT 1
        `).get(
            String(guildId),
            dollars
        ) || null
    );
}

// --------------------------------------------------------
// DONATIONS
// Donation amounts are stored as cents.
// --------------------------------------------------------

function hasDonation(
    provider,
    transactionId
) {
    return !!db.prepare(`
        SELECT 1
        FROM donations
        WHERE provider = ?
          AND provider_transaction_id = ?
        LIMIT 1
    `).get(
        String(provider),
        String(transactionId)
    );
}

function recordDonation(data = {}) {
    const provider = String(
        data.provider || "kofi"
    );

    const transactionId = String(
        data.providerTransactionId || ""
    ).trim();

    if (!transactionId) {
        throw new TypeError(
            "providerTransactionId is required."
        );
    }

    const guildId = String(
        data.guildId || ""
    ).trim();

    if (!guildId) {
        throw new TypeError(
            "guildId is required."
        );
    }

    const amount = centsFromAmount(
        data.amount
    );

    const result = db.prepare(`
        INSERT OR IGNORE INTO donations (
            guild_id,
            provider,
            provider_transaction_id,
            donor_name,
            donor_email_hash,
            amount,
            currency,
            message,
            tier_id,
            discord_user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        guildId,
        provider,
        transactionId,

        data.donorName
            ? String(data.donorName).slice(0, 100)
            : null,

        hashEmail(data.donorEmail),

        amount,

        String(
            data.currency || "USD"
        )
            .toUpperCase()
            .slice(0, 8),

        data.message
            ? String(data.message).slice(0, 2000)
            : null,

        data.tierId
            ? normalizeTierId(data.tierId)
            : null,

        data.discordUserId
            ? String(data.discordUserId)
            : null
    );

    return {
        inserted: result.changes === 1,

        donation: db.prepare(`
            SELECT *
            FROM donations
            WHERE provider = ?
              AND provider_transaction_id = ?
        `).get(
            provider,
            transactionId
        )
    };
}

// --------------------------------------------------------
// DONATION QUERIES
// --------------------------------------------------------

function getDonation(
    guildId,
    id
) {
    return (
        db.prepare(`
            SELECT *
            FROM donations
            WHERE guild_id = ?
              AND id = ?
        `).get(
            String(guildId),
            Number(id)
        ) || null
    );
}

function listDonations(
    guildId,
    limit = 10,
    offset = 0
) {
    const safeLimit = Math.min(
        Math.max(Number(limit) || 10, 1),
        50
    );

    const safeOffset = Math.max(
        Number(offset) || 0,
        0
    );

    return db.prepare(`
        SELECT *
        FROM donations
        WHERE guild_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?
    `).all(
        String(guildId),
        safeLimit,
        safeOffset
    );
}

// --------------------------------------------------------
// STATISTICS
// --------------------------------------------------------

function getStats(guildId) {
    const row = db.prepare(`
        SELECT
            COUNT(*) AS donation_count,
            COALESCE(SUM(amount), 0) AS total_amount,
            COUNT(DISTINCT discord_user_id) AS linked_donors
        FROM donations
        WHERE guild_id = ?
    `).get(String(guildId));

    return {
        donationCount: Number(
            row?.donation_count || 0
        ),

        totalAmountCents: Number(
            row?.total_amount || 0
        ),

        totalAmount: amountFromCents(
            row?.total_amount || 0
        ),

        linkedDonors: Number(
            row?.linked_donors || 0
        )
    };
}

// --------------------------------------------------------
// FORMATTING
// --------------------------------------------------------

function formatAmount(
    cents,
    currency = "USD"
) {
    const amount =
        Number(cents || 0) / 100;

    try {
        return new Intl.NumberFormat(
            undefined,
            {
                style: "currency",
                currency: String(
                    currency || "USD"
                ).toUpperCase()
            }
        ).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${String(
            currency || "USD"
        ).toUpperCase()}`;
    }
}

// --------------------------------------------------------
// EXPORTS
// --------------------------------------------------------

module.exports = {
    ensureSettings,
    getSettings,
    updateSettings,

    normalizeTierId,
    setTier,
    getTier,
    removeTier,
    listTiers,
    getTierForAmount,

    hasDonation,
    recordDonation,
    getDonation,
    listDonations,
    getStats,

    centsFromAmount,
    amountFromCents,
    formatAmount,
    hashEmail
};