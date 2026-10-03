// ========================================================
// ASTER UI — PREMIUM DESIGN SYSTEM
// ========================================================

const themes = {
    aster: {
        name: "ASTER",
        brand: {
            symbol: "✦",
            name: "ASTER"
        },

        colors: {
            accent: 0x7C5CFF,
            accentSoft: 0x5B46C9,
            success: 0x43D17A,
            warning: 0xF2C94C,
            error: 0xFF5C7A,
            info: 0x6EA8FF,
            neutral: 0x20222A,
            muted: 0x2B2E38
        },

        headers: {
            default: "✦",
            command: "◆",
            section: "◇"
        },

        status: {
            success: "●",
            error: "●",
            warning: "●",
            info: "●",
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
            donations: "☕",
            security: "◆",
            moderation: "▣"
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
            link: "↗",
            configure: "⚙"
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
    return themes[name];
}

function registerTheme(name, theme) {
    if (!name || typeof theme !== "object") {
        throw new TypeError("Theme name and theme object are required.");
    }

    themes[name] = theme;
    return theme;
}

module.exports = {
    ...themes.aster,
    themes,
    getTheme,
    setTheme,
    registerTheme
};