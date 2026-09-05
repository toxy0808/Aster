const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

function run(command, args) {
    return new Promise((resolve, reject) => {
        execFile(
            command,
            args,
            {
                windowsHide: true,
                maxBuffer: 10 * 1024 * 1024
            },
            (error, stdout, stderr) => {
                if (error) {
                    reject(
                        new Error(
                            stderr?.trim() ||
                            error.message
                        )
                    );
                    return;
                }

                resolve({
                    stdout,
                    stderr
                });
            }
        );
    });
}

async function compressGif(buffer) {
    const tempDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), "aster-caption-")
    );

    const inputPath = path.join(
        tempDir,
        "input.gif"
    );

    const outputPath = path.join(
        tempDir,
        "output.gif"
    );

    try {
        await fs.promises.writeFile(
            inputPath,
            buffer
        );

        await run(ffmpegPath, [
            "-y",
            "-i",
            inputPath,

            "-vf",
            "fps=15,scale='min(1280,iw)':-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=sierra2",

            "-loop",
            "0",

            outputPath
        ]);

        const compressed = await fs.promises.readFile(
            outputPath
        );

        return compressed;

    } finally {
        await fs.promises.rm(
            tempDir,
            {
                recursive: true,
                force: true
            }
        );
    }
}

module.exports = {
    compressGif
};