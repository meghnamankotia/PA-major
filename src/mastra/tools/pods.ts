import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { EdgeTTS } from "node-edge-tts";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";

function resolveBinaryPath(filePath: string) {
    if (process.platform === "win32" && !filePath.endsWith(".exe")) {
        const exePath = filePath + ".exe";
        if (fs.existsSync(exePath)) return exePath;
    }
    return filePath;
}

const resolvedFfmpegPath = resolveBinaryPath(ffmpegPath!);
const resolvedFfprobePath = resolveBinaryPath(ffprobe.path);

if (!fs.existsSync(resolvedFfmpegPath)) throw new Error(`Invalid ffmpeg path: ${resolvedFfmpegPath}`);
if (!fs.existsSync(resolvedFfprobePath)) throw new Error(`Invalid ffprobe path: ${resolvedFfprobePath}`);

ffmpeg.setFfmpegPath(resolvedFfmpegPath);
ffmpeg.setFfprobePath(resolvedFfprobePath);

const podcastInput = z.object({
    title: z.string(),
    script: z.string().describe(`
Full podcast text. Format like:
Host: Welcome everyone to our show.
Guest: Thanks for having me!
Host: Let's dive into the topic...
  `),
    voices: z
        .object({
            host: z.string().default("en-US-JennyNeural"),  // female Edge TTS voice
            guest: z.string().default("en-US-GuyNeural"),   // male Edge TTS voice
        })
        .optional(),
});

export const podcastTool = createTool({
    id: "podcastTool",
    description: "Generate a multi-speaker podcast using free Edge Text-to-Speech (requires no billing).",
    inputSchema: podcastInput,

    execute: async ({ title, script, voices }) => {
        const { host, guest } = {
            host: "en-US-JennyNeural",
            guest: "en-US-GuyNeural",
            ...(voices || {}),
        };

        const outputDir = path.resolve("podcasts");
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const safeTitle = title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_").toLowerCase();
        const basePath = path.join(outputDir, safeTitle);

        const segments = script.split(/\r?\n+/).map(line => line.trim()).filter(line => /^\s*(Host|Guest)\s*:/i.test(line));
        const audioSegments: string[] = [];

        for (let i = 0; i < segments.length; i++) {
            const [speaker, ...contentArr] = segments[i].split(":");
            const text = contentArr.join(":").trim();
            const voiceName = speaker.toLowerCase().includes("guest") ? guest : host;

            const tts = new EdgeTTS({ voice: voiceName });
            const audioPath = `${basePath}_${i}.mp3`;

            await tts.ttsPromise(text, audioPath);
            audioSegments.push(audioPath);
        }

        const finalPath = `${basePath}_final.mp3`;

        await new Promise<void>((resolve, reject) => {
            const command = ffmpeg();
            audioSegments.forEach((seg) => command.input(seg));
            command
                .on("end", () => resolve())
                .on("error", reject)
                .mergeToFile(finalPath, outputDir);
        });

        // Cleanup individual segments
        audioSegments.forEach((seg) => fs.unlinkSync(seg));

        return {
            success: true,
            message: `Two-speaker podcast created successfully: ${finalPath}`,
            path: finalPath,
        };
    },
});
