
const fs = require('fs');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.POLLINATIONS_API_KEY;
// Use a 'smart' model if possible, defaulting to openai
const MODEL = 'openai';

const OUTPUT_FILE = path.join(__dirname, '../current_topic.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
}

const PROMPT = `
Generate a valid JSON object for a chart race / bar race video.
Choose a unique, engaging topic from categories like: technology adoption, social media growth, market share shifts, population changes, gaming revenue, streaming services, electric vehicle sales, cryptocurrency trends, or any data-driven competition over time.
Focus on visual comparison of 4-6 competing entities over 10-17 time periods.

Return ONLY raw JSON. No markdown. No reasoning.
Rules:
1. "topic" must be SHORT and catchy (max 6 words). Example: "Smartphone Market Share", "EV Sales Race", "Browser Wars".
2. "description": One short paragraph (1-2 sentences) explaining the chart.
3. "unit": The measurement unit (e.g. "Millions of Users", "Billions of Dollars", "Percentage (%)").
4. "value_prefix": Prefix for values (e.g. "$", "", "¥"). Use empty string if none.
5. "timeline_labels": Array of years or time periods (e.g. ["2015","2016",...,"2025"]). Must have 10-17 items.
6. "entities": Array of 4-6 objects, each with:
    - "name": Full name
    - "short_name": Short display name (1-2 words)
    - "values": Array of numbers matching timeline length. Values should show realistic growth/decline trends.
    - "color": Unique hex color
7. Social media captions: Generate realistic "youtube_description", "instagram_caption", "facebook_caption", "threads_caption", "twitter_caption" and "hashtags".
Structure:
{
  "topic": "TITLE",
  "description": "Description",
  "unit": "Millions of Users",
  "value_prefix": "",
  "timeline_labels": ["2015","2016","2017","2018","2019","2020","2021","2022","2023","2024","2025"],
  "entities": [
    {
      "name": "Entity Name",
      "short_name": "Short",
      "values": [100, 200, 350, 500, 700, 900, 1200, 1500, 1800, 2100, 2500],
      "color": "#FF5733"
    }
  ],
  "youtube_description": "Description for YouTube...",
  "instagram_caption": "Caption for Instagram...",
  "facebook_caption": "Caption for Facebook...",
  "threads_caption": "Caption for Threads...",
  "twitter_caption": "Caption for Twitter...",
  "hashtags": ["#tag1", "#tag2"]
}
`;

async function fetchTopic() {
    console.log(`Using Authenticated Endpoint: https://gen.pollinations.ai/v1/chat/completions`);
    console.log(`Model: ${MODEL}`);

    const postData = JSON.stringify({
        model: MODEL,
        messages: [
            { role: "user", content: PROMPT }
        ],
        jsonMode: true
    });

    const options = {
        hostname: 'gen.pollinations.ai',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Response Status:', res.statusCode);

            try {
                const response = JSON.parse(data);

                if (res.statusCode !== 200) {
                    console.error('API Error:', response);
                    process.exit(1);
                }

                // Extract content from OpenAI-compatible response structure
                let content = response.choices?.[0]?.message?.content;

                if (!content) {
                    throw new Error('No content in response');
                }

                // Clean markdown if present
                content = content.trim();
                const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/) || content.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    const jsonStr = jsonMatch[1] || jsonMatch[0];
                    const topic = JSON.parse(jsonStr);

                    // Normalize info
                    topic.entities.forEach((c, i) => {
                        if (!c.short_name) c.short_name = c.name.split(' ').slice(0, 2).join(' ');
                    });

                    console.log('Generated Topic:', topic.topic);
                    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(topic, null, 2));
                    console.log(`Saved to ${OUTPUT_FILE}`);
                } else {
                    console.error('Could not find JSON in response');
                    console.log('Raw content:', content);
                    process.exit(1);
                }

            } catch (e) {
                console.error('Parse Error:', e);
                console.log('Raw Data:', data);
                process.exit(1);
            }
        });
    });

    req.on('error', (e) => {
        console.error('Request Error:', e);
        process.exit(1);
    });

    req.write(postData);
    req.end();
}

fetchTopic();
