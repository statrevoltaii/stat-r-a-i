# StatRevoltAI Automation Workflow

This folder contains the full codebase for the @StatRevoltAI social media brand. It is fully automated and designed to run once a day.

## Project Structure
- `App.tsx`: The React/Canvas visualization engine (neon dark theme).
- `generate_topic.js`: AI Topic & Data generator (Gemini).
- `capture_demo.js`: High-quality video recording script (Puppeteer + FFmpeg).
- `daily_workflow.py`: The master orchestrator that runs everything.
- `upload/`: Python social media upload modules.

## How to Run Locally
1. Install Node.js dependencies:
   ```bash
   npm install
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the automation:
   ```bash
   python daily_workflow.py
   ```

## How to Automate (GitHub Actions)
The project is configured to run automatically at **9:00 PM IST** daily via GitHub Actions.
Workflow file: `.github/workflows/statrevolt-ai-automation.yml`

### Required GitHub Secrets:
- `POLLINATIONS_API_KEY`
- `YOUTUBE_CLIENT_SECRET_JSON`
- `INSTAGRAM_USERNAME`
- `INSTAGRAM_PASSWORD`
- `FACEBOOK_ACCESS_TOKEN`
- `THREADS_USERNAME`
- `THREADS_PASSWORD`
- `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`

## Brand Guidelines
- **Handle**: @StatRevoltAI
- **Theme**: Dark Background (#050505), Neon accents.
- **Hashtags**: Always strictly lowercase.
