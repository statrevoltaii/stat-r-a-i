import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ffmpeg = require('ffmpeg-static');

// Helper to check if server is responsive
async function isServerRunning(url) {
    return new Promise(resolve => {
        const req = http.get(url, (res) => {
            resolve(res.statusCode >= 200 && res.statusCode < 400);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1500, () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function capture() {
    console.log('🚀 Starting 100% Deterministic 30 FPS Video Rendering Pipeline...');
    const FINAL_PATH = path.join(__dirname, 'recording.mp4');
    const THUMB_JPG = path.join(__dirname, 'thumbnail.jpg');
    const THUMB_PNG = path.join(__dirname, 'thumbnail.png');
    const EXPORT_DIR = path.join(__dirname, '..', 'FINAL_EXPORTED_VIDEOS');

    // 1. Ensure Vite dev server is running
    const serverUrl = 'http://localhost:3000';
    let devProcess = null;
    const isUp = await isServerRunning(serverUrl);
    if (!isUp) {
        console.log('⚡ Starting Vite server in background...');
        devProcess = spawn('npx', ['vite', '--port', '3000', '--host', '0.0.0.0'], {
            cwd: __dirname,
            shell: true,
            stdio: 'ignore'
        });
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 500));
            if (await isServerRunning(serverUrl)) {
                console.log('✅ Vite server is online!');
                break;
            }
        }
    }

    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: fs.existsSync(edgePath) ? edgePath : undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1080,1920',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-background-timer-throttling'
        ],
        defaultViewport: { width: 1080, height: 1920, deviceScaleFactor: 1 },
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    console.log('Navigating to app at http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Audio soundtrack selection
    const STATE_FILE = path.join(__dirname, 'audio_state.json');
    let audioTrackPath = '';
    if (fs.existsSync(STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        const nextIndex = (state.last_index + 1) % state.total_tracks;
        audioTrackPath = path.join(__dirname, 'public', 'audio', 'viral', state.tracks[nextIndex]);
        state.last_index = nextIndex;
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        console.log(`🎵 Using Viral Track: ${state.tracks[nextIndex]} (Track ${nextIndex + 1}/${state.total_tracks})`);
    }

    // Pacing constants
    const FPS = 30;
    const DURATION_SEC = 14;
    const HOLD_END_SEC = 2.5;
    const TOTAL_ANIM_FRAMES = FPS * DURATION_SEC; // 420 frames
    const TOTAL_HOLD_FRAMES = Math.round(FPS * HOLD_END_SEC); // 75 frames
    const TOTAL_FRAMES = TOTAL_ANIM_FRAMES + TOTAL_HOLD_FRAMES; // 495 frames (~16.5s)

    console.log(`🎬 Deterministic Render: ${TOTAL_FRAMES} frames @ ${FPS} FPS (${DURATION_SEC}s race + ${HOLD_END_SEC}s hold)...`);

    // Clean up old recording and frame cache
    if (fs.existsSync(FINAL_PATH)) fs.unlinkSync(FINAL_PATH);
    const FRAMES_DIR = path.join(__dirname, 'temp_render_frames');
    if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
    fs.mkdirSync(FRAMES_DIR, { recursive: true });

    const startTime = Date.now();

    // Stream frames in batches of 15 for fast IPC
    const BATCH_SIZE = 15;
    for (let f = 0; f < TOTAL_FRAMES; f += BATCH_SIZE) {
        const batchFrames = [];
        const count = Math.min(BATCH_SIZE, TOTAL_FRAMES - f);
        for (let b = 0; b < count; b++) {
            const frameIndex = f + b;
            const progress = Math.min(frameIndex / TOTAL_ANIM_FRAMES, 1.0);
            batchFrames.push(progress);
        }

        const base64List = await page.evaluate(async (progressList) => {
            const canvas = document.querySelector('canvas');
            if (!canvas) return [];
            const list = [];
            for (const p of progressList) {
                if (window.seekToProgress) {
                    window.seekToProgress(p);
                }
                const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
                list.push(dataUrl.substring(23)); // Remove 'data:image/jpeg;base64,'
            }
            return list;
        }, batchFrames);

        for (let i = 0; i < base64List.length; i++) {
            const frameNum = f + i;
            const filename = `frame_${String(frameNum).padStart(5, '0')}.jpg`;
            fs.writeFileSync(path.join(FRAMES_DIR, filename), Buffer.from(base64List[i], 'base64'));
        }

        const pct = Math.round(((f + count) / TOTAL_FRAMES) * 100);
        process.stdout.write(`\rRendering progress: ${pct}% (${f + count}/${TOTAL_FRAMES} frames)...`);
    }

    console.log('\nAll frames captured to disk. Closing browser to free CPU/RAM...');
    await browser.close();

    console.log('⚡ Encoding pristine 30 FPS MP4 with FFmpeg (-preset veryfast +faststart)...');
    const framePattern = path.join(FRAMES_DIR, 'frame_%05d.jpg');
    const ffmpegArgs = [
        '-y',
        '-r', String(FPS),
        '-i', framePattern
    ];

    if (audioTrackPath && fs.existsSync(audioTrackPath)) {
        ffmpegArgs.push('-stream_loop', '-1', '-i', audioTrackPath);
        ffmpegArgs.push('-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1');
        ffmpegArgs.push('-r', String(FPS));
        ffmpegArgs.push('-b:v', '6500k', '-maxrate', '8000k', '-bufsize', '12000k');
        ffmpegArgs.push('-g', '30', '-keyint_min', '30', '-sc_threshold', '0');
        ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2');
        ffmpegArgs.push('-map', '0:v:0', '-map', '1:a:0');
        ffmpegArgs.push('-shortest');
        ffmpegArgs.push('-movflags', '+faststart');
    } else {
        ffmpegArgs.push('-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1');
        ffmpegArgs.push('-r', String(FPS));
        ffmpegArgs.push('-b:v', '6500k');
        ffmpegArgs.push('-g', '30', '-keyint_min', '30', '-sc_threshold', '0');
        ffmpegArgs.push('-movflags', '+faststart');
    }

    ffmpegArgs.push(FINAL_PATH);

    const ffmpegProcess = spawn(ffmpeg, ffmpegArgs, { stdio: 'inherit' });

    await new Promise((resolve, reject) => {
        ffmpegProcess.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg exited with code ${code}`));
        });
        ffmpegProcess.on('error', err => reject(err));
    });

    // Cleanup temporary frame cache
    if (fs.existsSync(FRAMES_DIR)) {
        fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
    }

    const elapsedTotal = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Pristine 30 FPS MP4 rendered in ${elapsedTotal} seconds!`);

    const mp4SizeMb = (fs.statSync(FINAL_PATH).size / (1024 * 1024)).toFixed(2);
    console.log(`📊 Final MP4 Size: ${mp4SizeMb} MB`);

    // Extract vibrant 8-second thumbnail snapshot
    console.log('📸 Generating vibrant thumbnail snapshot at 8 seconds...');
    const thumbProcess = spawn(ffmpeg, [
        '-y',
        '-ss', '00:00:08',
        '-i', FINAL_PATH,
        '-vframes', '1',
        '-q:v', '2',
        THUMB_JPG
    ], { stdio: 'inherit' });

    await new Promise(r => thumbProcess.on('close', r));
    fs.copyFileSync(THUMB_JPG, THUMB_PNG);
    console.log(`✅ Thumbnail saved to ${THUMB_JPG} and ${THUMB_PNG}`);

    // Copy to FINAL_EXPORTED_VIDEOS for user convenience
    if (fs.existsSync(EXPORT_DIR)) {
        const sampleTarget = path.join(EXPORT_DIR, 'StatRevoltAI_Camera_Wars_Comparison.mp4');
        fs.copyFileSync(FINAL_PATH, sampleTarget);
        console.log(`📁 Sample copied to: ${sampleTarget}`);

        const thumbTarget = path.join(EXPORT_DIR, 'StatRevoltAI_Camera_Wars_Comparison_preview.jpg');
        fs.copyFileSync(THUMB_JPG, thumbTarget);
        console.log(`📸 Preview image saved to: ${thumbTarget}`);
    }

    console.log('🏁 Video capture and generation completed successfully!');
    process.exit(0);
}

capture().catch(e => {
    console.error('Fatal error during capture:', e);
    process.exit(1);
});
