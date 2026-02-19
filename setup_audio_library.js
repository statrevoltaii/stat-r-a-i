
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MUSIC_DIR = path.join(__dirname, 'insta music');
const PUBLIC_MUSIC_DIR = path.join(__dirname, 'public', 'audio', 'viral');
const STATE_FILE = path.join(__dirname, 'audio_state.json');

async function setupAudio() {
    if (!fs.existsSync(PUBLIC_MUSIC_DIR)) {
        fs.mkdirSync(PUBLIC_MUSIC_DIR, { recursive: true });
    }

    const files = fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3'));
    console.log(`🎵 Found ${files.length} audio files. Preparing library...`);

    const mapping = [];
    files.forEach((file, index) => {
        const newName = `track_${index + 1}.mp3`;
        const oldPath = path.join(MUSIC_DIR, file);
        const newPath = path.join(PUBLIC_MUSIC_DIR, newName);

        fs.copyFileSync(oldPath, newPath);
        mapping.push({ original: file, current: newName });
    });

    const state = {
        last_index: -1,
        total_tracks: files.length,
        tracks: mapping.map(m => m.current)
    };

    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log(`✅ Library ready with ${state.total_tracks} tracks. State saved to audio_state.json`);
}

setupAudio();
