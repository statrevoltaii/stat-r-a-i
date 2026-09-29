import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { spawn, execSync } from 'child_process';
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
    console.log('🚀 Starting High-Precision 60 FPS Native Video Capture...');
    const WEBM_PATH = path.join(__dirname, 'temp_video.webm');
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
        // Wait up to 15s for server to start
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
            '--autoplay-policy=no-user-gesture-required',
            '--enable-gpu-rasterization',
            '--enable-zero-copy',
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--high-dpi-support=1',
            '--force-device-scale-factor=1'
        ],
        defaultViewport: { width: 1080, height: 1920, deviceScaleFactor: 1 },
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

    // Collect native video chunks streamed from browser MediaRecorder
    const videoChunks = [];
    await page.exposeFunction('saveVideoChunk', (base64) => {
        videoChunks.push(Buffer.from(base64, 'base64'));
    });

    // Handle console logs for debugging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    console.log('Navigating to app at http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));

    // Inject in-browser 60 FPS MediaRecorder directly attached to canvas
    console.log('Injecting In-Browser 60 FPS MediaRecorder...');
    const recorderStatus = await page.evaluate(async () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return { error: 'Canvas not found' };

        const stream = canvas.captureStream(60);
        let mime = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mime)) {
            mime = 'video/webm;codecs=vp8';
        }
        if (!MediaRecorder.isTypeSupported(mime)) {
            mime = 'video/webm';
        }

        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: mime,
            videoBitsPerSecond: 16000000
        });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                const reader = new FileReader();
                reader.onload = () => (window).saveVideoChunk(reader.result.split(',')[1]);
                reader.readAsDataURL(e.data);
            }
        };

        (window)._activeRecorder = mediaRecorder;
        mediaRecorder.start(100);

        // Trigger animation
        if ((window).startSorting) (window).startSorting();

        return { success: true, mime };
    });

    console.log('Recorder initialized:', recorderStatus);
    console.log('Recording 60 FPS race animation in progress...');

    // Wait until animation signals completion
    try {
        await page.waitForFunction(() => (window).isSortingCompleted === true, { timeout: 75000 });
        console.log('✅ Animation completed successfully!');
    } catch (e) {
        console.warn('⚠️ Timeout waiting for completion signal, stopping manually.');
    }

    // Hold frame for confetti decay
    await new Promise(r => setTimeout(r, 1800));

    // Stop MediaRecorder
    await page.evaluate(() => {
        if ((window)._activeRecorder && (window)._activeRecorder.state !== 'inactive') {
            (window)._activeRecorder.stop();
        }
    });

    // Wait for remaining chunks to flush
    await new Promise(r => setTimeout(r, 1200));
    await browser.close();

    const totalBytes = videoChunks.reduce((acc, c) => acc + c.length, 0);
    console.log(`📦 Captured ${videoChunks.length} video chunks (${(totalBytes / (1024 * 1024)).toFixed(2)} MB)`);

    if (videoChunks.length === 0) {
        console.error('❌ No video chunks were captured!');
        process.exit(1);
    }

    fs.writeFileSync(WEBM_PATH, Buffer.concat(videoChunks));
    console.log(`💾 Raw WebM saved to ${WEBM_PATH}`);

    // Select soundtrack from viral music library
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

    // Transcode WebM to 60 FPS MP4 and merge audio
    console.log('🎬 Transcoding to pristine 60 FPS MP4 (H.264/AAC)...');
    try {
        if (audioTrackPath && fs.existsSync(audioTrackPath)) {
            console.log('Merging with Viral Audio (Looping enabled)...');
            execSync(`"${ffmpeg}" -y -i "${WEBM_PATH}" -stream_loop -1 -i "${audioTrackPath}" -c:v libx264 -pix_fmt yuv420p -r 60 -b:v 9000k -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -shortest "${FINAL_PATH}"`);
        } else {
            console.warn('Viral audio not found. Saving video only.');
            execSync(`"${ffmpeg}" -y -i "${WEBM_PATH}" -c:v libx264 -pix_fmt yuv420p -r 60 -b:v 9000k "${FINAL_PATH}"`);
        }

        console.log(`✅ Success! High-definition 60 FPS video saved to ${FINAL_PATH}`);
        const mp4SizeMb = (fs.statSync(FINAL_PATH).size / (1024 * 1024)).toFixed(2);
        console.log(`📊 Final MP4 Size: ${mp4SizeMb} MB`);

        // Generate high-contrast, vibrant thumbnail snapshot at 8 seconds (peak race action)
        console.log('📸 Generating vibrant thumbnail snapshot at 8 seconds...');
        execSync(`"${ffmpeg}" -y -ss 00:00:08 -i "${FINAL_PATH}" -vframes 1 -q:v 2 "${THUMB_JPG}"`);
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

        // Clean up raw WebM to save disk space
        if (fs.existsSync(WEBM_PATH)) fs.unlinkSync(WEBM_PATH);

    } catch (e) {
        console.error('❌ FFmpeg transcode/merge failed:', e.message);
        process.exit(1);
    }

    console.log('🏁 Video capture and generation completed successfully!');
    process.exit(0);
}

capture().catch(e => {
    console.error('Fatal error during capture:', e);
    process.exit(1);
});
