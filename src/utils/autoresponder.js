const fs = require("fs");
const path = require("path");

// ============================================================
// PATHS
// ============================================================

const filePath = path.join(
    __dirname,
    "../autoresponders.json"
);

// Project root = one level above src/utils
const mediaDirectory = path.join(
    __dirname,
    "../../data/autoresponders"
);

// Automatically create the media directory
if (!fs.existsSync(mediaDirectory)) {

    fs.mkdirSync(
        mediaDirectory,
        {
            recursive: true
        }
    );
}

// ============================================================
// STORAGE
// ============================================================

const autoresponders = new Map();

const MAX_TRIGGER_LENGTH = 100;
const MAX_AUTORESPONDERS_PER_GUILD = 50;

// Maximum media size: 10 MB
const MAX_MEDIA_SIZE =
    10 * 1024 * 1024;

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

        if (!raw.trim()) {
            return;
        }

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

        const tempFile =
            `${filePath}.tmp`;

        fs.writeFileSync(
            tempFile,
            JSON.stringify(
                data,
                null,
                2
            )
        );

        fs.renameSync(
            tempFile,
            filePath
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
// MEDIA HELPERS
// ============================================================

function getExtension(
    attachment
) {

    const name =
        attachment?.name || "";

    const extension =
        path.extname(
            name
        ).toLowerCase();

    const allowed = [
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif"
    ];

    if (
        allowed.includes(
            extension
        )
    ) {

        return extension;
    }

    return "";
}

// ============================================================
// DOWNLOAD MEDIA
// ============================================================

async function downloadMedia(
    guildId,
    trigger,
    type,
    attachment
) {

    if (!attachment?.url) {

        throw new Error(
            "MISSING_ATTACHMENT"
        );
    }

    // --------------------------------------------------------
    // Size check before downloading
    // --------------------------------------------------------

    if (
        attachment.size &&
        attachment.size >
            MAX_MEDIA_SIZE
    ) {

        throw new Error(
            "MEDIA_TOO_LARGE"
        );
    }

    // --------------------------------------------------------
    // Extension
    // --------------------------------------------------------

    let extension =
        getExtension(
            attachment
        );

    const contentType =
        (
            attachment.contentType ||
            ""
        ).toLowerCase();

    // --------------------------------------------------------
    // GIF validation
    // --------------------------------------------------------

    if (type === "gif") {

        if (
            extension !== ".gif" &&
            !contentType.includes("gif")
        ) {

            throw new Error(
                "INVALID_GIF"
            );
        }

        extension = ".gif";
    }

    // --------------------------------------------------------
    // Image validation
    // --------------------------------------------------------

    else {

        if (
            contentType &&
            !contentType.startsWith(
                "image/"
            )
        ) {

            throw new Error(
                "INVALID_IMAGE"
            );
        }

        if (!extension) {

            if (
                contentType.includes("png")
            ) {

                extension = ".png";

            } else if (
                contentType.includes("jpeg") ||
                contentType.includes("jpg")
            ) {

                extension = ".jpg";

            } else if (
                contentType.includes("webp")
            ) {

                extension = ".webp";

            } else {

                throw new Error(
                    "INVALID_IMAGE"
                );
            }
        }
    }

    // --------------------------------------------------------
    // Guild directory
    // --------------------------------------------------------

    const guildDirectory =
        path.join(
            mediaDirectory,
            guildId
        );

    if (!fs.existsSync(guildDirectory)) {

        fs.mkdirSync(
            guildDirectory,
            {
                recursive: true
            }
        );
    }

    // --------------------------------------------------------
    // Safe filename
    // --------------------------------------------------------

    const safeTrigger =
        trigger
            .replace(
                /[^a-z0-9_-]/gi,
                "_"
            )
            .slice(
                0,
                40
            );

    const uniqueId =
        `${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;

    const filename =
        `${safeTrigger}_${uniqueId}${extension}`;

    const fullPath =
        path.join(
            guildDirectory,
            filename
        );

    // --------------------------------------------------------
    // Download from Discord
    // --------------------------------------------------------

    const response =
        await fetch(
            attachment.url
        );

    if (!response.ok) {

        throw new Error(
            "MEDIA_DOWNLOAD_FAILED"
        );
    }

    // --------------------------------------------------------
    // Check content length
    // --------------------------------------------------------

    const contentLength =
        response.headers.get(
            "content-length"
        );

    if (
        contentLength &&
        Number(contentLength) >
            MAX_MEDIA_SIZE
    ) {

        throw new Error(
            "MEDIA_TOO_LARGE"
        );
    }

    // --------------------------------------------------------
    // Download
    // --------------------------------------------------------

    const buffer =
        Buffer.from(
            await response.arrayBuffer()
        );

    // Final size protection
    if (
        buffer.length >
        MAX_MEDIA_SIZE
    ) {

        throw new Error(
            "MEDIA_TOO_LARGE"
        );
    }

    // --------------------------------------------------------
    // Save
    // --------------------------------------------------------

    fs.writeFileSync(
        fullPath,
        buffer
    );

    return fullPath;
}

// ============================================================
// DELETE MEDIA
// ============================================================

function deleteMedia(
    content
) {

    if (
        typeof content !== "string"
    ) {

        return;
    }

    // Only delete files inside ASTER's media directory
    const resolvedContent =
        path.resolve(
            content
        );

    const resolvedDirectory =
        path.resolve(
            mediaDirectory
        );

    if (
        !resolvedContent.startsWith(
            resolvedDirectory +
            path.sep
        )
    ) {

        return;
    }

    try {

        if (
            fs.existsSync(
                resolvedContent
            )
        ) {

            fs.unlinkSync(
                resolvedContent
            );
        }

    } catch (error) {

        console.error(
            "AUTO-RESPONDER MEDIA DELETE ERROR:",
            error
        );
    }
}

// ============================================================
// DELETE GUILD MEDIA
// ============================================================

function deleteGuildMedia(
    guildId
) {

    const guildDirectory =
        path.join(
            mediaDirectory,
            guildId
        );

    try {

        if (
            fs.existsSync(
                guildDirectory
            )
        ) {

            fs.rmSync(
                guildDirectory,
                {
                    recursive: true,
                    force: true
                }
            );
        }

    } catch (error) {

        console.error(
            "AUTO-RESPONDER GUILD MEDIA DELETE ERROR:",
            error
        );
    }
}

// ============================================================
// ADD
// ============================================================

async function add(
    guildId,
    trigger,
    type,
    content,
    attachment = null
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

    // ========================================================
    // MEDIA
    // ========================================================

    if (
        type === "image" ||
        type === "gif"
    ) {

        if (!attachment) {

            return {
                success: false,
                reason: "attachment_required"
            };
        }

        try {

            content =
                await downloadMedia(
                    guildId,
                    trigger,
                    type,
                    attachment
                );

        } catch (error) {

            console.error(
                "AUTO-RESPONDER MEDIA ERROR:",
                error
            );

            return {
                success: false,
                reason:
                    error.message ===
                    "MEDIA_TOO_LARGE"

                        ? "media_too_large"

                        : error.message ===
                          "INVALID_GIF"

                            ? "invalid_gif"

                            : error.message ===
                              "INVALID_IMAGE"

                                ? "invalid_image"

                                : "media_download_failed"
            };
        }
    }

    // ========================================================
    // PREVIOUS RESPONSE
    // ========================================================

    const previous =
        guild.get(
            trigger
        );

    // ========================================================
    // SAVE
    // ========================================================

    guild.set(
        trigger,
        {
            type,
            content
        }
    );

    // ========================================================
    // CLEAN OLD MEDIA
    // ========================================================

    if (
        previous &&
        (
            previous.type === "image" ||
            previous.type === "gif"
        ) &&
        previous.content !== content
    ) {

        deleteMedia(
            previous.content
        );
    }

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

    const normalizedTrigger =
        trigger
            .trim()
            .toLowerCase();

    const response =
        guild.get(
            normalizedTrigger
        );

    const deleted =
        guild.delete(
            normalizedTrigger
        );

    if (deleted) {

        if (
            response &&
            (
                response.type === "image" ||
                response.type === "gif"
            )
        ) {

            deleteMedia(
                response.content
            );
        }

        if (guild.size === 0) {

            autoresponders.delete(
                guildId
            );

            deleteGuildMedia(
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

function clear(
    guildId
) {

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

    deleteGuildMedia(
        guildId
    );

    save();

    return true;
}

// ============================================================
// START
// ============================================================

load();

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    autoresponders,
    getGuild,
    add,
    remove,
    clear,
    MAX_TRIGGER_LENGTH,
    MAX_AUTORESPONDERS_PER_GUILD
};