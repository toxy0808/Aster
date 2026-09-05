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

        CREATE INDEX IF NOT EXISTS idx_users_level
        ON users(level DESC);
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

let xpCache = null;
let xpCacheTime = 0;

let reputationCache = null;
let reputationCacheTime = 0;


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


        const total =
            db.prepare(`
                SELECT COUNT(*) AS count
                FROM users
                WHERE user_id != 'TEST'
            `).get();


        res.json({

            count:
                Number(total?.count) || 0,

            returned:
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
// ASTER XP & LEVELS API
// =========================================================

app.get("/api/xp", (req, res) => {

    try {

        const now = Date.now();

        if (
            xpCache &&
            now - xpCacheTime < CACHE_TIME
        ) {
            return res.json(xpCache);
        }


        const stats = db.prepare(`
            SELECT

                COUNT(*) AS members,

                COALESCE(
                    SUM(xp),
                    0
                ) AS total_xp,

                COALESCE(
                    AVG(xp),
                    0
                ) AS average_xp,

                COALESCE(
                    MAX(xp),
                    0
                ) AS highest_xp,

                COALESCE(
                    AVG(level),
                    0
                ) AS average_level,

                COALESCE(
                    MAX(level),
                    0
                ) AS highest_level

            FROM users

            WHERE user_id != 'TEST'
        `).get();


        const levelDistribution = db.prepare(`
            SELECT
                level,
                COUNT(*) AS members
            FROM users
            WHERE user_id != 'TEST'
            GROUP BY level
            ORDER BY level ASC
        `).all();


        const topXP = db.prepare(`
            SELECT
                user_id,
                xp,
                level
            FROM users
            WHERE user_id != 'TEST'
            ORDER BY xp DESC
            LIMIT 10
        `).all();


        const topLevels = db.prepare(`
            SELECT
                user_id,
                xp,
                level
            FROM users
            WHERE user_id != 'TEST'
            ORDER BY level DESC, xp DESC
            LIMIT 10
        `).all();


        const xpActivity = db.prepare(`
            SELECT
                strftime('%Y-%m-%d', created_at) AS day,
                SUM(amount) AS amount
            FROM activity_logs
            WHERE created_at >= datetime('now', '-30 days')
              AND user_id != 'TEST'
              AND type = 'xp'
            GROUP BY day
            ORDER BY day ASC
        `).all();


        xpCache = {

            stats: {

                members:
                    Number(stats?.members) || 0,

                totalXP:
                    Number(stats?.total_xp) || 0,

                averageXP:
                    Math.round(
                        Number(stats?.average_xp) || 0
                    ),

                highestXP:
                    Number(stats?.highest_xp) || 0,

                averageLevel:
                    Number(
                        stats?.average_level
                    ) || 0,

                highestLevel:
                    Number(
                        stats?.highest_level
                    ) || 0

            },

            levelDistribution:
                levelDistribution.map(row => ({

                    level:
                        Number(row.level) || 0,

                    members:
                        Number(row.members) || 0

                })),

            topXP:
                topXP.map(row => ({

                    userId:
                        row.user_id,

                    xp:
                        Number(row.xp) || 0,

                    level:
                        Number(row.level) || 1

                })),

            topLevels:
                topLevels.map(row => ({

                    userId:
                        row.user_id,

                    xp:
                        Number(row.xp) || 0,

                    level:
                        Number(row.level) || 1

                })),

            xpActivity:
                xpActivity.map(row => ({

                    day:
                        row.day,

                    amount:
                        Number(row.amount) || 0

                }))

        };


        xpCacheTime = now;

        res.json(xpCache);

    } catch (error) {

        console.error(
            "ASTER XP API ERROR:",
            error
        );

        res.status(500).json({
            error: "Failed to load XP data"
        });

    }

});


// =========================================================
// ASTER REPUTATION API
// =========================================================

app.get("/api/reputation", (req, res) => {

    try {

        const now = Date.now();

        if (
            reputationCache &&
            now - reputationCacheTime < CACHE_TIME
        ) {
            return res.json(reputationCache);
        }


        // Detect the reputation column automatically.
        // This avoids changing the production database.

        const userColumns =
            db.prepare(`
                PRAGMA table_info(users)
            `).all();


        const reputationColumn =
            userColumns.find(column =>
                [
                    "reputation",
                    "rep",
                    "reps"
                ].includes(
                    String(column.name).toLowerCase()
                )
            );


        if (!reputationColumn) {

            reputationCache = {

                available: false,

                reason:
                    "No reputation column exists in users table.",

                stats: {

                    members: 0,
                    totalReputation: 0,
                    averageReputation: 0,
                    highestReputation: 0,
                    lowestReputation: 0

                },

                topReputation: [],

                distribution: []

            };

            reputationCacheTime = now;

            return res.json(
                reputationCache
            );
        }


        const column =
            `"${reputationColumn.name.replace(/"/g, '""')}"`;


        const stats = db.prepare(`
            SELECT

                COUNT(*) AS members,

                COALESCE(
                    SUM(${column}),
                    0
                ) AS total_reputation,

                COALESCE(
                    AVG(${column}),
                    0
                ) AS average_reputation,

                COALESCE(
                    MAX(${column}),
                    0
                ) AS highest_reputation,

                COALESCE(
                    MIN(${column}),
                    0
                ) AS lowest_reputation

            FROM users

            WHERE user_id != 'TEST'
        `).get();


        const topReputation = db.prepare(`
            SELECT
                user_id,
                ${column} AS reputation,
                level,
                xp
            FROM users
            WHERE user_id != 'TEST'
            ORDER BY ${column} DESC
            LIMIT 10
        `).all();


        const distribution = db.prepare(`
            SELECT
                CASE
                    WHEN ${column} < 0 THEN 'Negative'
                    WHEN ${column} = 0 THEN 'Neutral'
                    WHEN ${column} BETWEEN 1 AND 10 THEN '1-10'
                    WHEN ${column} BETWEEN 11 AND 25 THEN '11-25'
                    WHEN ${column} BETWEEN 26 AND 50 THEN '26-50'
                    WHEN ${column} BETWEEN 51 AND 100 THEN '51-100'
                    ELSE '100+'
                END AS bucket,
                COUNT(*) AS members
            FROM users
            WHERE user_id != 'TEST'
            GROUP BY bucket
            ORDER BY
                CASE bucket
                    WHEN 'Negative' THEN 1
                    WHEN 'Neutral' THEN 2
                    WHEN '1-10' THEN 3
                    WHEN '11-25' THEN 4
                    WHEN '26-50' THEN 5
                    WHEN '51-100' THEN 6
                    WHEN '100+' THEN 7
                END
        `).all();


        reputationCache = {

            available: true,

            column:
                reputationColumn.name,

            stats: {

                members:
                    Number(stats?.members) || 0,

                totalReputation:
                    Number(
                        stats?.total_reputation
                    ) || 0,

                averageReputation:
                    Number(
                        stats?.average_reputation
                    ) || 0,

                highestReputation:
                    Number(
                        stats?.highest_reputation
                    ) || 0,

                lowestReputation:
                    Number(
                        stats?.lowest_reputation
                    ) || 0

            },

            topReputation:
                topReputation.map(row => ({

                    userId:
                        row.user_id,

                    reputation:
                        Number(
                            row.reputation
                        ) || 0,

                    level:
                        Number(
                            row.level
                        ) || 1,

                    xp:
                        Number(
                            row.xp
                        ) || 0

                })),

            distribution:
                distribution.map(row => ({

                    bucket:
                        row.bucket,

                    members:
                        Number(
                            row.members
                        ) || 0

                }))

        };


        reputationCacheTime = now;

        res.json(
            reputationCache
        );

    } catch (error) {

        console.error(
            "ASTER REPUTATION API ERROR:",
            error
        );

        res.status(500).json({
            error: "Failed to load reputation data"
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