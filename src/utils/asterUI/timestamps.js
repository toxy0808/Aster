// ========================================================
// ASTER UI — TIMESTAMP SYSTEM
// ========================================================

function unixTimestamp(date = new Date()) {
    return Math.floor(new Date(date).getTime() / 1000);
}

function discordTimestamp(date = new Date(), style = "f") {
    return `<t:${unixTimestamp(date)}:${style}>`;
}

function now() {
    return discordTimestamp(new Date(), "f");
}

function relative(date = new Date()) {
    return discordTimestamp(date, "R");
}

function shortDate(date = new Date()) {
    return discordTimestamp(date, "d");
}

function longDate(date = new Date()) {
    return discordTimestamp(date, "D");
}

function dateTime(date = new Date()) {
    return discordTimestamp(date, "f");
}

function fullDateTime(date = new Date()) {
    return discordTimestamp(date, "F");
}

module.exports = {
    unixTimestamp,
    discordTimestamp,
    now,
    relative,
    shortDate,
    longDate,
    dateTime,
    fullDateTime
};