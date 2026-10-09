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

## Deploy on DigitalOcean App Platform

The App Platform service configuration is in [`.do/app.yaml`](.do/app.yaml). After these changes are pushed to the public GitHub repository, connect it in DigitalOcean App Platform and deploy from this spec. In the service settings, add `GEMINI_API_KEY` as a **secret runtime environment variable** before using photo analysis. Do not put the key in the app spec or commit it. The sample walkthrough works without it. App Platform injects the configured `PORT`; the server uses that port automatically. The spec prepares deployment; it does not create a DigitalOcean app by itself.

The source is released under the [MIT License](LICENSE).

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

FixItLocal is designed for the Hacktoberfest Hack Day Montréal × AGEEI **Best Use of Gemma 4** category. It pairs a user's photo with their description and uses Gemma 4's multimodal reasoning as the core of a focused troubleshooting guide. This matches the category's text-and-image and productivity/learning focus. Hosted inference through Gemini API is part of the documented Gemma workflow; the project does not claim local or offline inference.

It also targets the **Best Use of DigitalOcean** category with a DigitalOcean App Platform deployment spec. To demonstrate actual DigitalOcean usage, deploy the public GitHub repository to App Platform and add the Gemini API key as a secret there. The repository uses the MIT open-source license, and Gemma 4 is the open-weight model central to photo-based diagnosis. Together these make the open model and DigitalOcean hosting concrete parts of how the project works.

For the separate Hacktoberfest Open-Source AI Challenge Week 1 “Touch Grass” prompt, FixItLocal aims to make the screen a short step toward a real-world repair. The challenge requires a public GitHub repository, an open-source license, and open-source/open-weight AI as an important part of the project; those are represented here by the GitHub source, MIT license, and Gemma 4 integration.
