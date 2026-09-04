const express = require("express");
const path = require("path");
const db = require("../src/database/database");
console.log("✦ DASHBOARD DB:", db.name);
console.log(
    "✦ DASHBOARD DB ROWS:",
    db.prepare("SELECT COUNT(*) AS count FROM activity_logs").get()
);

const app = express();

const PORT = process.env.PORT || 25626;
const HOST = "0.0.0.0";

app.use(express.json());
app.use(express.static(__dirname));


// =========================
// ASTER DASHBOARD API
// =========================

app.get("/api/overview", (req, res) => {
    try {
        const config = db.prepare(`
            SELECT *
            FROM server_config
            LIMIT 1
        `).get();

        const members = db.prepare(`
            SELECT COUNT(*) AS count
            FROM users
            WHERE user_id != 'TEST'
        `).get();

        const messages = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS count
            FROM activity_logs
            WHERE type = 'chat'
              AND user_id != 'TEST'
        `).get();

        const voice = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS amount
            FROM activity_logs
            WHERE type = 'voice'
              AND user_id != 'TEST'
        `).get();

        const xp = db.prepare(`
            SELECT COALESCE(SUM(xp), 0) AS amount
            FROM users
            WHERE user_id != 'TEST'
        `).get();

        const chatKing = db.prepare(`
            SELECT
                user_id,
                SUM(amount) AS amount
            FROM activity_logs
            WHERE type = 'chat'
              AND user_id != 'TEST'
            GROUP BY user_id
            ORDER BY amount DESC
            LIMIT 1
        `).get();

        const voiceKing = db.prepare(`
            SELECT
                user_id,
                SUM(amount) AS amount
            FROM activity_logs
            WHERE type = 'voice'
              AND user_id != 'TEST'
            GROUP BY user_id
            ORDER BY amount DESC
            LIMIT 1
        `).get();


        // =========================
        // LAST 24 HOURS
        // =========================

        const activity24h = db.prepare(`
            SELECT
                type,
                COALESCE(SUM(amount), 0) AS amount
            FROM activity_logs
            WHERE created_at >= datetime('now', '-24 hours')
              AND user_id != 'TEST'
            GROUP BY type
        `).all();

        let activityMessages24h = 0;
        let activityVoice24h = 0;

        for (const row of activity24h) {
            if (row.type === "chat") {
                activityMessages24h = Number(row.amount) || 0;
            }

            if (row.type === "voice") {
                activityVoice24h = Number(row.amount) || 0;
            }
        }


        res.json({
            status: "online",

            server: {
                guildId: config?.guild_id || null
            },

            stats: {
                members: Number(members?.count) || 0,
                messages: Number(messages?.count) || 0,
                voice: Number(voice?.amount) || 0,
                xp: Number(xp?.amount) || 0
            },

            activity24h: {
                messages: activityMessages24h,
                voice: activityVoice24h
            },

            kings: {
                chat: chatKing || null,
                voice: voiceKing || null
            }
        });

    } catch (error) {
        console.error(
            "ASTER DASHBOARD API ERROR:",
            error
        );

        res.status(500).json({
            error: "Failed to load ASTER data"
        });
    }
});


// =========================
// ASTER ACTIVITY API
// =========================

app.get("/api/activity", (req, res) => {
    try {
        const period =
            String(req.query.period || "24h").toLowerCase();

        const periods = {
            "24h": {
                modifier: "-24 hours",
                format: "%H"
            },

            "7d": {
                modifier: "-7 days",
                format: "%Y-%m-%d"
            },

            "30d": {
                modifier: "-30 days",
                format: "%Y-%m-%d"
            }
        };

        const selected =
            periods[period] || periods["24h"];

        const rows = db.prepare(`
            SELECT
                strftime(
                    '${selected.format}',
                    created_at
                ) AS bucket,
                type,
                COALESCE(SUM(amount), 0) AS amount
            FROM activity_logs
            WHERE created_at >= datetime(
                'now',
                '${selected.modifier}'
            )
              AND user_id != 'TEST'
            GROUP BY bucket, type
            ORDER BY bucket ASC
        `).all();

        const buckets = new Map();

        for (const row of rows) {
            if (!buckets.has(row.bucket)) {
                buckets.set(row.bucket, {
                    bucket: row.bucket,
                    chat: 0,
                    voice: 0
                });
            }

            const entry =
                buckets.get(row.bucket);

            if (row.type === "chat") {
                entry.chat =
                    Number(row.amount) || 0;
            }

            if (row.type === "voice") {
                entry.voice =
                    Number(row.amount) || 0;
            }
        }

        res.json({
            period:
                period === "7d"
                    ? "7D"
                    : period === "30d"
                        ? "30D"
                        : "24H",

            activity:
                Array.from(buckets.values())
        });

    } catch (error) {
        console.error(
            "ASTER ACTIVITY API ERROR:",
            error
        );

        res.status(500).json({
            error: "Failed to load activity data"
        });
    }
});


// =========================
// DASHBOARD
// =========================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "index.html"
        )
    );
});


// =========================
// START
// =========================

app.listen(PORT, HOST, () => {
    console.log("");
    console.log("✦ ─────────────────────────────");
    console.log("✦ ASTER COMMAND CENTER");
    console.log(`✦ http://${HOST}:${PORT}`);
    console.log("✦ ─────────────────────────────");
    console.log("");
});