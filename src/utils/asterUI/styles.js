// ========================================================
// ASTER UI — THEME / STYLE SYSTEM
// ========================================================
//
// Keep appearance here. Commands should not hard-code ASTER
// symbols, accent colors, or repeated UI text.
//
// Discord container accent colors use integer RGB values.
// ========================================================

const themes = {
    aster: {
        name: "ASTER",
        symbol: "✦",
        colors: {
            accent: 0x5865F2,
            success: 0x57F287,
            warning: 0xFEE75C,
            error: 0xED4245,
            info: 0x5865F2,
            neutral: 0x2B2D31
        },

        headers: {
            default: "◆",
            command: "✦",
            section: "◇"
        },

        status: {
            success: "✓",
            error: "✕",
            warning: "!",
            info: "ⓘ",
            pending: "◌",
            online: "●",
            offline: "○"
        },

        sections: {
            activity: "⌁",
            chat: "◉",
            voice: "◈",
            leaderboard: "♛",
            user: "♙",
            settings: "⚙",
            automation: "⌘",
            reputation: "✚",
            level: "◇",
            time: "◷",
            donations: "☕"
        },

        actions: {
            add: "+",
            remove: "−",
            edit: "✎",
            delete: "⌫",
            refresh: "↻",
            search: "⌕",
            back: "‹",
            next: "›",
            link: "↗"
        },

        text: {
            bullet: "•",
            arrow: "→",
            divider: "·"
        }
    }
};

let activeTheme = "aster";

function getTheme(name = activeTheme) {
    return themes[name] || themes.aster;
}

function setTheme(name) {
    if (!themes[name]) {
        throw new Error(`Unknown ASTER UI theme: ${name}`);
    }

    activeTheme = name;
    return getTheme();
}

function registerTheme(name, theme) {
    if (!name || typeof theme !== "object") {
        throw new TypeError("Theme name and object are required.");
    }

    themes[name] = theme;
    return theme;
}

module.exports = {
    ...getTheme(),
    themes,
    getTheme,
    setTheme,
    registerTheme
};
