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


// =========================================================
// ASTER DATABASE OPTIMIZATION
// =========================================================

try {
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_activity_type_created
        ON activity_logs(type, created_at);

        CREATE INDEX IF NOT EXISTS idx_activity_user_type
        ON activity_logs(user_id, type);

        CREATE INDEX IF NOT EXISTS idx_activity_created
        ON activity_logs(created_at);

        CREATE INDEX IF NOT EXISTS idx_users_xp
        ON users(xp DESC);

        CREATE INDEX IF NOT EXISTS idx_users_user_id
        ON users(user_id);
    `);

    console.log("✦ ASTER DATABASE INDEXES READY");

} catch (error) {
    console.error(
        "ASTER DATABASE INDEX ERROR:",
        error
    );
}


// =========================================================
// CACHE
// =========================================================

const CACHE_TIME = 10000;

let overviewCache = null;
let overviewCacheTime = 0;

const activityCache = new Map();


// =========================================================
// ASTER DASHBOARD API
// =========================================================

app.get("/api/overview", (req, res) => {

    try {

        const now = Date.now();

        if (
            overviewCache &&
            now - overviewCacheTime < CACHE_TIME
        ) {
            return res.json(overviewCache);
        }


        const config = db.prepare(`
            SELECT guild_id
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


        // =====================================================
        // LAST 24 HOURS
        // =====================================================

        const activity24h = db.prepare(`
            SELECT
                type,
                SUM(amount) AS amount
            FROM activity_logs
            WHERE created_at >= datetime('now', '-24 hours')
              AND user_id != 'TEST'
              AND type IN ('chat', 'voice')
            GROUP BY type
        `).all();


        let activityMessages24h = 0;
        let activityVoice24h = 0;


        for (const row of activity24h) {

            if (row.type === "chat") {
                activityMessages24h =
                    Number(row.amount) || 0;
            }

            if (row.type === "voice") {
                activityVoice24h =
                    Number(row.amount) || 0;
            }

        }


        overviewCache = {

            status: "online",

            server: {
                guildId:
                    config?.guild_id || null
            },

            stats: {

                members:
                    Number(members?.count) || 0,

                messages:
                    Number(messages?.count) || 0,

                voice:
                    Number(voice?.amount) || 0,

                xp:
                    Number(xp?.amount) || 0

            },

            activity24h: {

                messages:
                    activityMessages24h,

                voice:
                    activityVoice24h

            },

            kings: {

                chat:
                    chatKing || null,

                voice:
                    voiceKing || null

            }

        };


        overviewCacheTime = now;

        res.json(overviewCache);

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


// =========================================================
// ASTER ACTIVITY API
// =========================================================

app.get("/api/activity", (req, res) => {

    try {

        const period =
            String(
                req.query.period || "24h"
            ).toLowerCase();


        const validPeriod =
            period === "24h"
                ? "24h"
                : period === "30d"
                    ? "30d"
                    : "7d";


        const now = Date.now();

        const cached =
            activityCache.get(validPeriod);


        if (
            cached &&
            now - cached.time < CACHE_TIME
        ) {
            return res.json(cached.data);
        }


        if (validPeriod === "24h") {

            const rows = db.prepare(`
                SELECT
                    strftime('%H', created_at) AS hour,
                    type,
                    SUM(amount) AS amount
                FROM activity_logs
                WHERE created_at >= datetime('now', '-24 hours')
                  AND user_id != 'TEST'
                  AND type IN ('chat', 'voice')
                GROUP BY hour, type
                ORDER BY hour ASC
            `).all();


            const lookup = new Map();


            for (const row of rows) {

                lookup.set(
                    `${row.hour}-${row.type}`,
                    Number(row.amount) || 0
                );

            }


            const activity = [];


            for (
                let hour = 0;
                hour < 24;
                hour++
            ) {

                const hourString =
                    String(hour).padStart(2, "0");


                activity.push({

                    hour: hourString,

                    chat:
                        lookup.get(
                            `${hourString}-chat`
                        ) || 0,

                    voice:
                        lookup.get(
                            `${hourString}-voice`
                        ) || 0

                });

            }


            const result = {
                period: "24H",
                activity
            };


            activityCache.set(
                validPeriod,
                {
                    time: now,
                    data: result
                }
            );


            return res.json(result);

        }


        const days =
            validPeriod === "30d"
                ? 30
                : 7;


        const rows = db.prepare(`
            SELECT
                strftime('%Y-%m-%d', created_at) AS day,
                type,
                SUM(amount) AS amount
            FROM activity_logs
            WHERE created_at >= datetime('now', ?)
              AND user_id != 'TEST'
              AND type IN ('chat', 'voice')
            GROUP BY day, type
            ORDER BY day ASC
        `).all(`-${days} days`);


        const lookup = new Map();


        for (const row of rows) {

            lookup.set(
                `${row.day}-${row.type}`,
                Number(row.amount) || 0
            );

        }


        const activity = [];


        for (
            let offset = days - 1;
            offset >= 0;
            offset--
        ) {

            const date =
                new Date(
                    Date.now() -
                    offset * 86400000
                );


            const year =
                date.getUTCFullYear();


            const month =
                String(
                    date.getUTCMonth() + 1
                ).padStart(2, "0");


            const day =
                String(
                    date.getUTCDate()
                ).padStart(2, "0");


            const dateString =
                `${year}-${month}-${day}`;


            activity.push({

                day: dateString,

                chat:
                    lookup.get(
                        `${dateString}-chat`
                    ) || 0,

                voice:
                    lookup.get(
                        `${dateString}-voice`
                    ) || 0

            });

        }


        const result = {

            period:
                validPeriod === "30d"
                    ? "30D"
                    : "7D",

            activity

        };


        activityCache.set(
            validPeriod,
            {
                time: now,
                data: result
            }
        );


        res.json(result);

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


// =========================================================
// ASTER MEMBERS API
// =========================================================

app.get("/api/members", (req, res) => {

    try {

        const search =
            String(
                req.query.search || ""
            ).trim();


        const limit = 50;

        let rows;


        if (search) {

            rows = db.prepare(`
                SELECT
                    user_id,
                    messages,
                    voice_time,
                    xp,
                    level
                FROM users
                WHERE user_id != 'TEST'
                  AND user_id LIKE ?
                ORDER BY xp DESC
                LIMIT ?
            `).all(
                `%${search}%`,
                limit
            );

        } else {

            rows = db.prepare(`
                SELECT
                    user_id,
                    messages,
                    voice_time,
                    xp,
                    level
                FROM users
                WHERE user_id != 'TEST'
                ORDER BY xp DESC
                LIMIT ?
            `).all(limit);

        }


        res.json({

            count:
                rows.length,

            members:
                rows.map(member => ({

                    userId:
                        member.user_id,

                    messages:
                        Number(
                            member.messages
                        ) || 0,

                    voiceTime:
                        Number(
                            member.voice_time
                        ) || 0,

                    xp:
                        Number(
                            member.xp
                        ) || 0,

                    level:
                        Number(
                            member.level
                        ) || 1

                }))

        });

    } catch (error) {

        console.error(
            "ASTER MEMBERS API ERROR:",
            error
        );

        res.status(500).json({
            error: "Failed to load members"
        });

    }

});


// =========================================================
// DASHBOARD
// =========================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "index.html"
        )
    );

});


// =========================================================
// START
// =========================================================

app.listen(
    PORT,
    HOST,
    () => {

        console.log("");
        console.log(
            "✦ ─────────────────────────────"
        );
        console.log(
            "✦ ASTER COMMAND CENTER"
        );
        console.log(
            `✦ http://${HOST}:${PORT}`
        );
        console.log(
            "✦ ─────────────────────────────"
        );
        console.log("");

    }
);