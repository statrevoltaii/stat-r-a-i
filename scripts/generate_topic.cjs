
const fs = require('fs');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const API_KEY = process.env.POLLINATIONS_API_KEY;
// Use a 'smart' model if possible, defaulting to openai
const MODEL = 'openai';

const OUTPUT_FILE = path.join(__dirname, '../src/data/current_topic.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
}

const PROMPT = `
Generate a valid JSON object for an algorithm visualization.
Topics: "Neural Network Training Complexity", "Database Indexing Performance", "Sorting Algorithm Stability", "Pathfinding Heuristics", "Encryption Algorithm Speed".
Focus on visual comparison of 4-6 competing approaches.

Return ONLY raw JSON. No markdown. No reasoning.
Rules:
1. Title must be SHORT, SIMPLE, and catchy (max 4 words). No jargon like "Complexity Analysis". Example: "AI Speed Test", "Fastest Sort?", "Database Race".
2. **THEME & COLORS**: Generate a UNIQUE, COHESIVE color palette for this specific topic. Avoid generic red/blue/green.
   - Example 1 (Cyberpunk): #00FFAA, #FF00FF, #FFFF00, #00FFFF
   - Example 2 (Sunset): #FF4500, #FFD700, #FF1493, #8A2BE2
   - Example 3 (Forest): #00FF00, #32CD32, #ADFF2F, #228B22
   - Ensure high contrast against black background.
3. Formulas: standard JS math. **CRITICAL**: Formulas MUST REFLECT REAL WORLD DIFFERENCES.
   - Use the FULL range 0-100 on the Y axis.
   - **DO NOT CLAMP** values to 100 using Math.min. If a value exceeds 100, let it go off the chart naturally (this represents infinite complexity or failure).
   - Speed/Complexity (Time): Bad algorithms should curve UP and off the top. Good ones stay low.
   - Accuracy/Score (Quality): Good algorithms should curve UP and asymptote towards 100.
   - Example 1 O(n^2): "n => 0.015 * n * n" (Goes to ~150 at n=100)
   - Example 2 O(log n): "n => 20 * Math.log(n + 1)" (Curves gently)
   - DO NOT make all lines linear or flat. VARIETY IS KEY.
   - Ensure curves start at appropriate values (e.g. 0 or small number).
4. Tagline: One short sentence explaining the metric.
Structure:
{
  "title": "TITLE",
  "tagline": "Subtitle",
  "xAxisLabel": "X Axis Label",
  "yAxisLabel": "Y Axis Label",
  "curves": [
    {
      "id": "1",
      "label": "Bubble Sort",
      "color": "#FF00FF",
      "formula": "n => 0.1 * n * n",
      "code": "for(i=0;i<n;i++) for(j=0;j<n-i-1;j++)..."
    }
  ]
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
                    topic.curves.forEach((c, i) => {
                        if (!c.id) c.id = `curve-${i}`;
                        if (!c.name) c.name = c.label;
                    });

                    console.log('Generated Topic:', topic.title);
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
