# FixItLocal

**See it. Sort it. Safely.** FixItLocal turns a photo and a short description into a cautious first look, beginner-friendly troubleshooting steps, and a handoff note for a repair professional.

## Run it

Requires Node.js 20 or newer. The app has no npm dependencies.

```sh
cp .env.example .env
# Add your Google AI Studio API key to .env
npm start
```

Open [http://localhost:3000](http://localhost:3000). Without an API key, the sample dishwasher walkthrough still demonstrates the full interface. Real photo analysis needs `GEMINI_API_KEY` on the server; never put the key in browser code or commit `.env`.

Set `GEMMA_MODEL` to choose a Gemma 4 model available to your API key. The default is `gemma-4-26b-a4b-it`.

## What it does

- Accepts JPG, PNG, and WEBP images up to 10 MB.
- Sends the photo and symptom together to Gemma 4 through the Gemini API.
- Returns a visual summary, risk label, safe next steps, suggested supplies, and a concise professional handoff.
- Keeps the API key server-side and does not store uploaded photos.
- Includes a sample case that can be demoed without credentials.

## Safety scope

FixItLocal is an educational first look, not a definitive diagnosis or a substitute for a qualified technician. The model is instructed to avoid live electrical work, gas-line work, bypassing safety features, and unverified part recommendations. Emergency signals in the user's description trigger a hard-coded stop message in the browser. A model can still misunderstand an image or return unsafe information, so users should follow the appliance manual and stop when uncertain.

## Stack

- HTML, CSS, and browser JavaScript
- Node.js built-in HTTP server
- Google Gemini API with Gemma 4 multimodal inference

## Hackathon fit

FixItLocal makes the screen a short step between a household problem and an informed real-world action. It uses an open-weight Gemma model for image-plus-text reasoning and communicates uncertainty before suggesting a repair. This project is a fit for the Hacktoberfest Open-Source AI Challenge Week 1 theme, “Touch Grass,” and the Best Use of Gemma category.
