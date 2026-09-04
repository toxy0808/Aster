const express = require("express");
const path = require("path");
const db = require("../src/database/database");
console.log("✦ DASHBOARD DB:", db.name);
console.log(
    "✦ DASHBOARD DB ROWS:",
    db.prepare("SELECT COUNT(*) AS count FROM activity_logs").get()
);

const app = express();

const PORT = process.env.PORT || 3000;
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
        const rows = db.prepare(`
            SELECT
                strftime('%H', created_at) AS hour,
                type,
                COALESCE(SUM(amount), 0) AS amount
            FROM activity_logs
            WHERE created_at >= datetime('now', '-24 hours')
              AND user_id != 'TEST'
            GROUP BY hour, type
            ORDER BY hour ASC
        `).all();

        const activity = [];

        for (let hour = 0; hour < 24; hour++) {
            const hourString =
                String(hour).padStart(2, "0");

            const chat = rows.find(
                row =>
                    row.hour === hourString &&
                    row.type === "chat"
            );

            const voice = rows.find(
                row =>
                    row.hour === hourString &&
                    row.type === "voice"
            );

            activity.push({
                hour: hourString,
                chat: Number(chat?.amount || 0),
                voice: Number(voice?.amount || 0)
            });
        }

        res.json({
            period: "24H",
            activity
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