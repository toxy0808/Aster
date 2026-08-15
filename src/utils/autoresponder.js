const fs = require("fs");
const path = require("path");

const filePath = path.join(
    __dirname,
    "../autoresponders.json"
);

const autoresponders = new Map();

const MAX_TRIGGER_LENGTH = 100;
const MAX_AUTORESPONDERS_PER_GUILD = 50;

// ============================================================
// LOAD
// ============================================================

function load() {
    try {

        if (!fs.existsSync(filePath)) {

            fs.writeFileSync(
                filePath,
                "{}"
            );

            return;
        }

        const raw =
            fs.readFileSync(
                filePath,
                "utf8"
            );

        if (!raw.trim()) return;

        const data =
            JSON.parse(raw);

        autoresponders.clear();

        for (
            const [guildId, responses]
            of Object.entries(data)
        ) {

            const guildMap =
                new Map();

            for (
                const [trigger, response]
                of Object.entries(responses)
            ) {

                if (
                    !response ||
                    !response.type ||
                    typeof response.content !== "string"
                ) {
                    continue;
                }

                guildMap.set(
                    trigger,
                    response
                );
            }

            if (guildMap.size > 0) {

                autoresponders.set(
                    guildId,
                    guildMap
                );
            }
        }

        console.log(
            `AUTO-RESPONDER: Loaded ${autoresponders.size} guild(s)`
        );

    } catch (error) {

        console.error(
            "AUTO-RESPONDER LOAD ERROR:",
            error
        );
    }
}

// ============================================================
// SAVE
// ============================================================

function save() {

    try {

        const data = {};

        for (
            const [guildId, responses]
            of autoresponders
        ) {

            data[guildId] =
                Object.fromEntries(
                    responses
                );
        }

        fs.writeFileSync(
            filePath,
            JSON.stringify(
                data,
                null,
                2
            )
        );

    } catch (error) {

        console.error(
            "AUTO-RESPONDER SAVE ERROR:",
            error
        );
    }
}

// ============================================================
// GET
// ============================================================

function getGuild(guildId) {

    return autoresponders.get(
        guildId
    );
}

// ============================================================
// ADD
// ============================================================

function add(
    guildId,
    trigger,
    type,
    content
) {

    trigger =
        trigger
            .trim()
            .toLowerCase();

    if (!trigger) {
        return {
            success: false,
            reason: "invalid_trigger"
        };
    }

    if (
        trigger.length >
        MAX_TRIGGER_LENGTH
    ) {
        return {
            success: false,
            reason: "trigger_too_long"
        };
    }

    let guild =
        autoresponders.get(
            guildId
        );

    if (!guild) {

        guild = new Map();

        autoresponders.set(
            guildId,
            guild
        );
    }

    if (
        !guild.has(trigger) &&
        guild.size >=
            MAX_AUTORESPONDERS_PER_GUILD
    ) {

        return {
            success: false,
            reason: "guild_limit"
        };
    }

    guild.set(
        trigger,
        {
            type,
            content
        }
    );

    save();

    return {
        success: true
    };
}

// ============================================================
// REMOVE
// ============================================================

function remove(
    guildId,
    trigger
) {

    const guild =
        autoresponders.get(
            guildId
        );

    if (!guild) {
        return false;
    }

    const deleted =
        guild.delete(
            trigger
                .trim()
                .toLowerCase()
        );

    if (deleted) {

        if (guild.size === 0) {

            autoresponders.delete(
                guildId
            );
        }

        save();
    }

    return deleted;
}

// ============================================================
// CLEAR
// ============================================================

function clear(guildId) {

    const guild =
        autoresponders.get(
            guildId
        );

    if (!guild) {
        return false;
    }

    autoresponders.delete(
        guildId
    );

    save();

    return true;
}

// ============================================================
// START
// ============================================================

load();

module.exports = {
    autoresponders,
    getGuild,
    add,
    remove,
    clear,
    MAX_TRIGGER_LENGTH,
    MAX_AUTORESPONDERS_PER_GUILD
};