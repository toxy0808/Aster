const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/autoresponders.json");

const autoresponders = new Map();

// ============================================================
// LOAD
// ============================================================

function load() {
    try {
        if (!fs.existsSync(filePath)) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, "{}");
        }

        const data = JSON.parse(
            fs.readFileSync(filePath, "utf8")
        );

        autoresponders.clear();

        for (const [guildId, responses] of Object.entries(data)) {
            autoresponders.set(
                guildId,
                new Map(Object.entries(responses))
            );
        }

        console.log(
            `AUTO-RESPONDER: Loaded ${autoresponders.size} guild(s)`
        );

    } catch (error) {
        console.error("AUTO-RESPONDER LOAD ERROR:", error);
    }
}

// ============================================================
// SAVE
// ============================================================

function save() {
    try {
        const data = {};

        for (const [guildId, responses] of autoresponders) {
            data[guildId] = Object.fromEntries(responses);
        }

        fs.writeFileSync(
            filePath,
            JSON.stringify(data, null, 2)
        );

    } catch (error) {
        console.error("AUTO-RESPONDER SAVE ERROR:", error);
    }
}

// ============================================================
// GET GUILD
// ============================================================

function getGuild(guildId) {
    if (!autoresponders.has(guildId)) {
        autoresponders.set(guildId, new Map());
    }

    return autoresponders.get(guildId);
}

// ============================================================
// ADD
// ============================================================

function add(guildId, trigger, response) {
    const guild = getGuild(guildId);

    guild.set(
        trigger.toLowerCase().trim(),
        response
    );

    save();
}

// ============================================================
// REMOVE
// ============================================================

function remove(guildId, trigger) {
    const guild = getGuild(guildId);

    const deleted = guild.delete(
        trigger.toLowerCase().trim()
    );

    if (deleted) {
        save();
    }

    return deleted;
}

// ============================================================
// CLEAR
// ============================================================

function clear(guildId) {
    const guild = getGuild(guildId);

    guild.clear();

    save();
}

// ============================================================
// LOAD ON START
// ============================================================

load();

module.exports = {
    autoresponders,
    getGuild,
    add,
    remove,
    clear
};