// ========================================================
// ASTER UI — CENTRAL INTERFACE
// ========================================================

const symbols = require("./symbols");
const timestamps = require("./timestamps");
const styles = require("./styles");
const sections = require("./sections");

module.exports = {
    symbols,
    timestamps,
    styles,
    ...sections
};