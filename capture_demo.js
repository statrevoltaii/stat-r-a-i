import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import path from 'path';
import { fileURLToPath } from 'url';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ffmpeg = require('ffmpeg-static');

const fs = require('fs');
const { execSync } = require('child_process');

async function capture() {
    console.log('🚀 Starting Robust Audio/Video Capture...');
    const VIDEO_PATH = path.join(__dirname, 'temp_video.mp4');
    const AUDIO_PATH = path.join(__dirname, 'temp_audio.webm');
    const FINAL_PATH = path.join(__dirname, 'recording.mp4');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1080,1920',
            '--autoplay-policy=no-user-gesture-required',
        ],
        defaultViewport: { width: 1080, height: 1920 },
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });

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
        videoBitrate: 8000,
        audio: false // We capture audio manually
    });

    // Check for console errors
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    console.log('Navigating to app...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));

    // Inject manual audio recorder
    console.log('Injecting Audio Recorder...');
    await page.evaluate(() => {
        window.startAudioCapture = () => {
            // Create MediaRecorder from AudioService destination
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
                    // Convert blob to base64 and send to node
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
    console.log("Starting Video Recorder...");
    await recorder.start(VIDEO_PATH);

    // click body to enable audio context
    await page.click('body').catch(() => { });

    // START EVERYTHING
    console.log('Starting Animation & Audio...');
    await page.evaluate(() => {
        // 1. Resume Audio Context (User interaction simulation)
        const audioService = (window).audioService;
        if (audioService && audioService.resume) audioService.resume();

        // 2. Start Recording
        if ((window).startAudioCapture) (window).startAudioCapture();

        // 3. Start Visuals
        if ((window).startSorting) (window).startSorting();
    });

    console.log('Recording in progress...');

    // Wait until animation signals completion
    try {
        await page.waitForFunction(() => (window).isSortingCompleted === true, { timeout: 60000 });
    } catch (e) {
        console.log("Timeout waiting for completion signal, stopping manually.");
    }

    // Extra buffer
    await new Promise(r => setTimeout(r, 2000));

    // Stop everything
    await page.evaluate(() => {
        if (window._mediaRecorder && window._mediaRecorder.state !== 'inactive') {
            window._mediaRecorder.stop();
        }
    });

    // Give time for last chunks to arrive
    await new Promise(r => setTimeout(r, 1000));
    await recorder.stop();
    await browser.close();

    console.log('Processing files...');

    // 1. Determine which audio track to use (Rotate through library)
    const STATE_FILE = path.join(__dirname, 'audio_state.json');
    let audioTrackPath = '';
    if (fs.existsSync(STATE_FILE)) {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        const nextIndex = (state.last_index + 1) % state.total_tracks;
        audioTrackPath = path.join(__dirname, 'public', 'audio', 'viral', state.tracks[nextIndex]);
        state.last_index = nextIndex;
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        console.log(`🎵 Using Viral Track: ${state.tracks[nextIndex]} (Sequence: ${nextIndex + 1}/${state.total_tracks})`);
    } else {
        console.log('⚠️ audio_state.json not found. Falling back to default merge.');
    }

    if (fs.existsSync(VIDEO_PATH)) {
        try {
            // MERGE LOGIC: 
            // -stream_loop -1: Loops the audio infinitely
            // -shortest: Cuts the output when the SHORTEST stream (the video) ends
            // Result: Audio repeats if video is longer, and cuts off perfectly if audio is longer.
            if (audioTrackPath && fs.existsSync(audioTrackPath)) {
                console.log('Merging with Viral Audio (Looping enabled)...');
                execSync(`"${ffmpeg}" -y -i "${VIDEO_PATH}" -stream_loop -1 -i "${audioTrackPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${FINAL_PATH}"`);
            } else {
                console.warn('Viral audio not found. Saving video only.');
                fs.renameSync(VIDEO_PATH, FINAL_PATH);
            }
            console.log(`✅ Success! Video saved to ${FINAL_PATH}`);
            if (fs.existsSync(VIDEO_PATH)) fs.unlinkSync(VIDEO_PATH);
            if (fs.existsSync(AUDIO_PATH)) fs.unlinkSync(AUDIO_PATH);
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
