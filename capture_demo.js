import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { spawn } from 'child_process';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ffmpeg = require('ffmpeg-static');
const fs = require('fs');
const { execSync } = require('child_process');

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
    console.log('🚀 Starting Robust 60 FPS Audio/Video Capture...');
    const VIDEO_PATH = path.join(__dirname, 'temp_video.mp4');
    const AUDIO_PATH = path.join(__dirname, 'temp_audio.webm');
    const FINAL_PATH = path.join(__dirname, 'recording.mp4');
    const EXPORT_DIR = path.join(__dirname, '..', 'FINAL_EXPORTED_VIDEOS');

    // 1. Ensure dev server is running
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
            '--force-gpu-mem-available-mb=4096',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--high-dpi-support=1',
            '--force-device-scale-factor=1',
        ],
        defaultViewport: { width: 1080, height: 1920 },
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

    // Expose function to save audio chunks from browser
    const audioChunks = [];
    await page.exposeFunction('saveAudioChunk', (base64) => {
        audioChunks.push(Buffer.from(base64, 'base64'));
    });

    const recorder = new PuppeteerScreenRecorder(page, {
        followNewTab: true,
        fps: 60,
        ffmpeg_Path: ffmpeg,
        videoFrame: { width: 1080, height: 1920 },
        aspectRatio: '9:16',
        videoBitrate: 9000,
        audio: false // We capture audio manually
    });

    // Check for console errors
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    console.log('Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3500));

    // Inject manual audio recorder
    console.log('Injecting Audio Recorder...');
    await page.evaluate(() => {
        window.startAudioCapture = () => {
            const audioService = (window).audioService;
            if (!audioService || !audioService.ctx) return;

            const dest = audioService.ctx.createMediaStreamDestination();
            if (audioService.masterGain) {
                audioService.masterGain.connect(dest);
            }

            const options = { mimeType: 'audio/webm' };
            const mediaRecorder = new MediaRecorder(dest.stream, options);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    const reader = new FileReader();
                    reader.onload = () => (window).saveAudioChunk(reader.result.split(',')[1]);
                    reader.readAsDataURL(e.data);
                }
            };

            mediaRecorder.start(100);
            (window)._mediaRecorder = mediaRecorder;
        };
    });

    // Start video recording
    console.log("Starting 60 FPS Video Recorder...");
    await recorder.start(VIDEO_PATH);

    // click body to enable audio context
    await page.click('body').catch(() => { });

    // START EVERYTHING
    console.log('Starting Animation & Audio...');
    await page.evaluate(() => {
        const audioService = (window).audioService;
        if (audioService && audioService.resume) audioService.resume();
        if ((window).startAudioCapture) (window).startAudioCapture();
        if ((window).startSorting) (window).startSorting();
    });

    console.log('Recording in progress...');

    // Wait until animation signals completion
    try {
        await page.waitForFunction(() => (window).isSortingCompleted === true, { timeout: 60000 });
    } catch (e) {
        console.log("Timeout waiting for completion signal, stopping manually.");
    }

    // Hold on final frame for smooth ending
    await new Promise(r => setTimeout(r, 2500));

    // Stop audio recorder
    await page.evaluate(() => {
        if (window._mediaRecorder && window._mediaRecorder.state !== 'inactive') {
            window._mediaRecorder.stop();
        }
    });

    await new Promise(r => setTimeout(r, 1000));
    await recorder.stop();
    await browser.close();

    console.log('Processing and merging audio...');

    // Rotate through audio library
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

    if (fs.existsSync(VIDEO_PATH)) {
        try {
            if (audioTrackPath && fs.existsSync(audioTrackPath)) {
                console.log('Merging with Viral Audio (Looping enabled)...');
                execSync(`"${ffmpeg}" -y -i "${VIDEO_PATH}" -stream_loop -1 -i "${audioTrackPath}" -c:v copy -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -shortest "${FINAL_PATH}"`);
            } else {
                console.warn('Viral audio not found. Saving video only.');
                fs.renameSync(VIDEO_PATH, FINAL_PATH);
            }
            
            console.log(`✅ Success! Video saved to ${FINAL_PATH}`);
            if (fs.existsSync(VIDEO_PATH)) fs.unlinkSync(VIDEO_PATH);
            if (fs.existsSync(AUDIO_PATH)) fs.unlinkSync(AUDIO_PATH);

            // Copy to FINAL_EXPORTED_VIDEOS for user convenience
            if (fs.existsSync(EXPORT_DIR)) {
                const sampleTarget = path.join(EXPORT_DIR, 'StatRevoltAI_Camera_Wars_Comparison.mp4');
                fs.copyFileSync(FINAL_PATH, sampleTarget);
                console.log(`📁 Sample copied to: ${sampleTarget}`);

                // Generate preview poster image
                const thumbTarget = path.join(EXPORT_DIR, 'StatRevoltAI_Camera_Wars_Comparison_preview.jpg');
                execSync(`"${ffmpeg}" -y -ss 00:00:10 -i "${FINAL_PATH}" -vframes 1 -q:v 2 "${thumbTarget}"`);
                console.log(`📸 Preview image saved to: ${thumbTarget}`);
            }
        } catch (e) {
            console.error('FFmpeg merge failed:', e.message);
        }
    } else {
        console.warn('Video file not found. Capture might have failed.');
    }

    process.exit(0);
}

capture().catch(e => {
    console.error(e);
    process.exit(1);
});
