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
    const previousYear = currentYear - 1;
    const prompt = `IMPORTANT: You MUST generate actual data. DO NOT return disclaimers, warnings, or "data limitation" messages. Create a REAL viral topic with numbers.

Generate a viral "Timeline Comparison" dataset for a video visualization.
    The goal is to create a dramatic, high-contrast chart race video similar to "Yung Geeski" style.

    CRITICAL: Pick a UNIQUE and viral topic with REAL-WORLD ACCURACY.
    DO NOT repeat or use topics similar to these recent ones: [${historySlice}].

    DATA INTEGRITY RULE (MANDATORY):
    - NO PLACEHOLDERS. Use authentic, researched historical data points.
    - If an entity didn't exist in early years (e.g., SpaceX in 2000), use accurate '0' starting points.
    - Data must reflect ACTUAL market caps, user counts, or verified statistics.
    - Storytelling must be based on REAL historical events (crashes, pivots, takeovers).
    - FLEXIBLE END YEAR: Use the latest verified data you have access to. If you don't have verified 2026 data, use 2025. If 2025 is not available, use 2024. The end year should be the most recent year with REAL data.
    - NEVER return empty arrays or refusal messages. ALWAYS generate complete data with whatever latest year you can provide.

    TITLING RULE (MANDATORY):
    - DO NOT make titles that just list the entities (e.g., Avoid "A vs B vs C vs D").
    - USE a short, punchy 'Thematic Title' (e.g., "The Browser Wars", "The Billionaire Space Race", "The Death of Blockbuster").
    - Maximum title length: 50 characters.

    TIMELINE REQUIREMENT: End at the latest year you have verified data for (${previousYear} or ${currentYear} if available).
    The data MUST tell a story: one entity should skyrocket while another gets crushed.

    REQUIREMENTS:
    1.  **Topic & Description**: Viral, catchy thematic title (Subtitle is for the description).
    2.  **Entities**: 2-6 entities to compare. MUST use the key "values" for data points list.
    3.  **Timeline**: Start/End Year. Include ${currentYear} data. (20-50 points).
    4.  **METADATA & PLATFORMS**:
        -   **YouTube Description**: Detailed story with chapters/timestamps, call to action, sources, and 5-10 hashtags.
        -   **Instagram Caption**: ENGAGING & COMPREHENSIVE (300-500 words). Structure:
            *   HOOK: First line must grab attention with emoji (e.g., "🚀 The $500B Battle...")
            *   STORY: 3-5 paragraphs telling the dramatic story with key milestones, numbers, and turning points
            *   ENGAGEMENT: Ask a specific question to drive comments
            *   CALL TO ACTION: Tell them to follow/subscribe
            *   HASHTAGS: Exactly 30 high-traffic, relevant hashtags (mix of broad and niche)
        -   **Facebook Caption**: Formal/News-style with detailed explanation and 5-10 hashtags.
        -   **Threads Caption**: Conversational, casual tone.
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
                    { role: 'system', content: 'You are a data journalist and viral content creator. ALWAYS generate COMPLETE data with actual numbers. NEVER return disclaimers, warnings, or "data limitation" messages. Use the latest verified data you have - if 2026 data is not available, use 2025. If 2025 is not available, use 2024. ALWAYS use the key "values" for entity data arrays. NEVER use "data" as the key. For future years beyond your knowledge, use reasonable projections clearly marked as estimates. For Instagram captions, write COMPREHENSIVE, ENGAGING content (300-500 words) with a strong hook, detailed storytelling with real numbers/milestones, engagement question, call-to-action, and exactly 30 relevant hashtags. CRITICAL: entities array MUST have 2-6 items with non-empty values arrays. NEVER fail - always provide data up to whatever latest year you can.' },
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

        // --- DETECT AI REFUSAL/DISCLAIMER MESSAGES ---
        const refusalKeywords = ['data limitation', 'cannot produce', 'unable to', 'disclaimer', 'notice', 'warning', 'i can\'t', 'i cannot', 'projections only', 'training cutoff'];
        const topicLower = (content.topic || '').toLowerCase();
        const isRefusal = refusalKeywords.some(keyword => topicLower.includes(keyword)) && (!content.entities || content.entities.length === 0);
        
        if (isRefusal) {
            console.error('❌ AI returned a refusal/disclaimer message instead of data');
            console.error('Topic:', content.topic);
            throw new Error('AI refused to generate data - returned disclaimer message');
        }

        // --- FIX: Convert 'data' to 'values' BEFORE any other processing ---
        if (content.entities && Array.isArray(content.entities)) {
            content.entities.forEach(entity => {
                if (!entity.values && entity.data) {
                    entity.values = entity.data;
                    delete entity.data;
                }
            });
        }

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

        // --- VALIDATION WITH DETAILED ERROR LOGGING ---
        if (!content.entities) {
            console.error('❌ Validation failed: Missing "entities" key');
            console.error('Generated content keys:', Object.keys(content));
            throw new Error("Invalid data structure generated: Missing entities");
        }
        if (!Array.isArray(content.entities)) {
            console.error('❌ Validation failed: "entities" is not an array');
            console.error('Entities value:', content.entities);
            throw new Error("Invalid data structure generated: Entities is not an array");
        }
        if (content.entities.length === 0) {
            console.error('❌ Validation failed: "entities" array is empty');
            console.error('Full content:', JSON.stringify(content, null, 2));
            throw new Error("Invalid data structure generated: Empty entities");
        }
        if (!content.timeline_labels) {
            console.error('❌ Validation failed: Missing "timeline_labels" key');
            console.error('Generated content keys:', Object.keys(content));
            throw new Error("Invalid data structure generated: Missing timeline_labels");
        }
        if (!Array.isArray(content.timeline_labels)) {
            console.error('❌ Validation failed: "timeline_labels" is not an array');
            console.error('Timeline labels value:', content.timeline_labels);
            throw new Error("Invalid data structure generated: Timeline labels is not an array");
        }

        // Validate each entity has 'values'
        content.entities.forEach((entity, index) => {
            if (!entity.values || !Array.isArray(entity.values)) {
                console.error(`❌ Validation failed: Entity ${index} (${entity.name}) missing valid 'values'`);
                console.error('Entity:', JSON.stringify(entity, null, 2));
                throw new Error(`Invalid data structure: Entity ${index} missing values`);
            }
        });

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
        
        // --- FALLBACK: Generate a hardcoded viral topic if AI fails ---
        console.log('🔄 Generating fallback topic...');
        const cy = new Date().getFullYear();
        const y1 = cy - 2;
        const y2 = cy - 1;
        
        const fallbackTopics = [
            {
                topic: "The Streaming Wars",
                description: "Netflix vs Disney+ vs HBO Max: Battle for Dominance",
                unit: "Million Subscribers",
                value_prefix: "",
                timeline_labels: ["2019", "2020", "2021", "2022", "2023", "2024", String(y1), String(y2), String(cy)],
                entities: [
                    { name: "Netflix", short_name: "Netflix", values: [167, 203, 221, 230, 247, 260, 275, 290, 305], color: "" },
                    { name: "Disney+", short_name: "Disney", values: [28, 94, 129, 164, 190, 210, 230, 250, 270], color: "" },
                    { name: "HBO Max", short_name: "HBO", values: [0, 43, 73, 95, 105, 115, 125, 135, 145], color: "" }
                ]
            },
            {
                topic: "Electric Vehicle Revolution",
                description: "Tesla vs BYD vs VW: The EV Market Takeover",
                unit: "Million Vehicles Sold",
                value_prefix: "",
                timeline_labels: ["2018", "2019", "2020", "2021", "2022", "2023", "2024", String(y2), String(cy)],
                entities: [
                    { name: "Tesla", short_name: "Tesla", values: [0.24, 0.37, 0.5, 0.93, 1.31, 1.81, 2.2, 2.6, 3.0], color: "" },
                    { name: "BYD", short_name: "BYD", values: [0.24, 0.23, 0.43, 0.73, 1.86, 3.02, 3.5, 4.0, 4.5], color: "" },
                    { name: "Volkswagen", short_name: "VW", values: [0.04, 0.11, 0.22, 0.45, 0.57, 0.77, 0.9, 1.1, 1.3], color: "" }
                ]
            },
            {
                topic: "Social Media Titans",
                description: "TikTok vs Instagram vs Snapchat: Gen Z Attention Wars",
                unit: "Million Daily Active Users",
                value_prefix: "",
                timeline_labels: ["2018", "2019", "2020", "2021", "2022", "2023", "2024", String(y2), String(cy)],
                entities: [
                    { name: "TikTok", short_name: "TikTok", values: [271, 500, 689, 1000, 1200, 1400, 1550, 1700, 1850], color: "" },
                    { name: "Instagram", short_name: "Instagram", values: [500, 600, 700, 800, 900, 1000, 1100, 1200, 1300], color: "" },
                    { name: "Snapchat", short_name: "Snapchat", values: [187, 210, 265, 300, 350, 380, 400, 420, 440], color: "" }
                ]
            }
        ];
        
        // Pick a random fallback topic that's not in recent history
        const recentHistory = history.slice(-10);
        const availableTopics = fallbackTopics.filter(t => !recentHistory.includes(t.topic));
        const selectedTopic = availableTopics.length > 0 ? availableTopics[Math.floor(Math.random() * availableTopics.length)] : fallbackTopics[0];
        
        // Generate colors for entities
        const count = selectedTopic.entities.length;
        const startHue = Math.floor(Math.random() * 360);
        selectedTopic.entities.forEach((entity, i) => {
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
        });
        
        // Add social media captions
        selectedTopic.youtube_description = `📊 ${selectedTopic.topic}\n\n${selectedTopic.description}\n\n0:00 - Introduction\n0:30 - Early Days\n1:00 - The Turning Point\n2:00 - Explosive Growth\n3:00 - Current State\n4:00 - What's Next?\n\n#${selectedTopic.topic.replace(/\s/g, '')} #DataViz #ChartRace`;
        selectedTopic.instagram_caption = `🚀 ${selectedTopic.topic}: ${selectedTopic.description}\n\nThis visualization shows the dramatic shift in the industry. From humble beginnings to market dominance, see how these companies battled for supremacy.\n\nWhich company do you think will lead in 2027? Comment below! 👇\n\nFollow for more data visualizations!\n\n#dataviz #chart #visualization #trends #business #technology #growth #marketshare #infographic #data`;
        selectedTopic.facebook_caption = `${selectedTopic.topic}: A data-driven analysis of market dynamics. ${selectedTopic.description}\n\n#DataViz #Business #Technology`;
        selectedTopic.threads_caption = `The ${selectedTopic.topic} is wild! 📈 ${selectedTopic.description}`;
        selectedTopic.twitter_caption = `${selectedTopic.topic}: ${selectedTopic.description} 📊 #DataViz #Trends`;
        selectedTopic.hashtags = ["#dataviz", "#chart", "#visualization", "#trends", "#business", "#technology", "#growth", "#marketshare", "#infographic", "#data", "#analytics", "#stats", "#comparison", "#timeline", "#chartrace", "#viral", "#fyp", "#explore", "#dataisbeautiful", "#vizoftheday"];
        
        history.push(selectedTopic.topic);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
        fs.writeFileSync(TOPIC_FILE, JSON.stringify(selectedTopic, null, 2));
        
        console.log(`✅ Fallback topic generated: ${selectedTopic.topic}`);
        process.exit(0);
    }
}

generateNewTopic();
