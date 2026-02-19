import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const API_KEY = process.env.POLLINATIONS_API_KEY;
const MODEL = process.env.AI_MODEL || 'openai'; // Use .env model or fallback to openai for free tier
const TOPIC_FILE = path.join(__dirname, 'current_topic.json');
const HISTORY_FILE = path.join(__dirname, 'history.json');

async function generateNewTopic() {
    console.log(`🤖 Using AI Model: ${MODEL}`);
    // 1. Load History
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
        try {
            history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
        } catch (e) {
            console.error("❌ Error reading history.json:", e.message);
            history = [];
        }
    }

    const historySlice = history.slice(-50).join(', '); // Use last 50 topics for prompt context
    console.log(`🤖 Checking history... [${history.length} topics found]`);

    const currentYear = new Date().getFullYear();
    const prompt = `Generate a viral "Timeline Comparison" dataset for a video visualization.
    The goal is to create a dramatic, high-contrast chart race video similar to "Yung Geeski" style.

    CRITICAL: Pick a UNIQUE and viral topic with REAL-WORLD ACCURACY. 
    DO NOT repeat or use topics similar to these recent ones: [${historySlice}].
    
    DATA INTEGRITY RULE (MANDATORY):
    - NO PLACEHOLDERS. Use authentic, researched historical data points.
    - If an entity didn't exist in early years (e.g., SpaceX in 2000), use accurate '0' or 'N/A' starting points.
    - Data must reflect ACTUAL market caps, user counts, or verified statistics.
    - Storytelling must be based on REAL historical events (crashes, pivots, takeovers).

    TITLING RULE (MANDATORY):
    - DO NOT make titles that just list the entities (e.g., Avoid "A vs B vs C vs D").
    - USE a short, punchy 'Thematic Title' (e.g., "The Browser Wars", "The Billionaire Space Race", "The Death of Blockbuster").
    - Maximum title length: 50 characters.

    TIMELINE REQUIREMENT: Use data up to the current year (${currentYear}).
    The data MUST tell a story: one entity should skyrocket while another gets crushed.

    REQUIREMENTS:
    1.  **Topic & Description**: Viral, catchy thematic title (Subtitle is for the description).
    2.  **Entities**: 2-6 entities to compare. MUST use the key "values" for data points list.
    3.  **Timeline**: Start/End Year. Include ${currentYear} data. (20-50 points).
    4.  **METADATA & PLATFORMS**:
        -   **YouTube Description**: Detailed story, call to action, and 5 hashtags.
        -   **Instagram Caption**: Punchy hook + 30 high-traffic hashtags.
        -   **Facebook Caption**: Formal/News-style + 3-5 hashtags.
        -   **Threads Caption**: Conversational.
        -   **Twitter/X**: Short & punchy.

    OUTPUT FORMAT (JSON ONLY):
    {
        "topic": "...",
        "description": "...",
        "unit": "Billions USD",
        "value_prefix": "$",
        "timeline_labels": ["Year1", "Year2", ...],
        "entities": [
            {
                "name": "Full Entity Name",
                "short_name": "OneWord",
                "values": [NumericValue1, NumericValue2, ...],
                "color": "Leave empty"
            }
        ],
        "youtube_description": "...",
        "instagram_caption": "...",
        "facebook_caption": "...",
        "threads_caption": "...",
        "twitter_caption": "...",
        "hashtags": ["#tag1", "#tag2"]
    }
    `;

    try {
        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: 'You are a data journalist and viral content creator. ALWAYS use the key "values" for entity data arrays. NEVER use "data" as the key. Ensure data is current up to 2025.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' }
            })
        });

        const data = await response.json();

        if (!data.choices || !data.choices.length) {
            console.error('API Error Response:', JSON.stringify(data, null, 2));
            throw new Error('Invalid API response');
        }

        const content = JSON.parse(data.choices[0].message.content);

        // --- DISTINCT NEON COLOR GENERATOR ---
        // Even with many entities, this divides the 360-degree color wheel for maximum contrast
        if (content.entities && Array.isArray(content.entities)) {
            const count = content.entities.length;
            const startHue = Math.floor(Math.random() * 360);

            content.entities.forEach((entity, i) => {
                const h = (startHue + (i * (360 / count))) % 360;
                const s = 100;
                const l = 55;

                const a = s * Math.min(l, 100 - l) / 100;
                const f = n => {
                    const k = (n + h / 30) % 12;
                    const color = l / 100 - a / 100 * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                    return Math.round(255 * color).toString(16).padStart(2, '0');
                };
                entity.color = `#${f(0)}${f(8)}${f(4)}`;

                if (!entity.values && entity.data) {
                    entity.values = entity.data;
                    delete entity.data;
                }
            });
        }

        // --- LOWERCASE HASHTAGS ---
        if (content.hashtags && Array.isArray(content.hashtags)) {
            content.hashtags = content.hashtags.map(h => h.toLowerCase());
        }

        const lowerTags = (text) => text ? text.replace(/#\w+/g, (match) => match.toLowerCase()) : text;
        content.youtube_description = lowerTags(content.youtube_description);
        content.instagram_caption = lowerTags(content.instagram_caption);
        content.facebook_caption = lowerTags(content.facebook_caption);
        content.threads_caption = lowerTags(content.threads_caption);
        content.twitter_caption = lowerTags(content.twitter_caption);

        if (!content.entities || !content.timeline_labels || content.entities.length === 0) {
            throw new Error("Invalid data structure generated.");
        }

        // 2. Update History
        history.push(content.topic);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
        console.log(`✅ History updated with: ${content.topic}`);

        // 3. Save Current Topic
        fs.writeFileSync(TOPIC_FILE, JSON.stringify(content, null, 2));
        console.log(`✅ Data generated for: ${content.topic}`);
        return content;

    } catch (error) {
        console.error('❌ Failed to generate timeline data:', error.message);
        process.exit(1);
    }
}

generateNewTopic();
