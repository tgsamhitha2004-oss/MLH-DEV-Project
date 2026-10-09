# FixItLocal

**See it. Sort it. Safely.** FixItLocal turns a photo and a short description into a cautious first look, beginner-friendly troubleshooting steps, and a handoff note for a repair professional.

## Run it

Requires Node.js 20 or newer.

```sh
cp .env.example .env
# Set GOOGLE_CLOUD_PROJECT in .env
npm start
```

Open [http://localhost:3000](http://localhost:3000). The sample dishwasher walkthrough demonstrates the full interface without Google credentials. Real photo analysis uses Google Application Default Credentials (ADC); no API key is stored in the app.

### Set up local ADC

1. Install and sign in with the Google Cloud CLI, and select the Cloud project set in `GOOGLE_CLOUD_PROJECT`.
2. Enable the **Generative Language API** for that project.
3. Complete Google's OAuth consent setup and create a Desktop OAuth client if your organization requires one. Keep its downloaded client file private; `.gitignore` excludes it.
4. Create local ADC credentials with the scopes Google's OAuth guide specifies:

   ```sh
   gcloud auth application-default login --client-id-file=client_secret.json --scopes="https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/generative-language.retriever"
   ```

5. Set `GOOGLE_CLOUD_PROJECT` in `.env`, then start the app.

The server uses the Google Auth library to load and refresh ADC, then sends an OAuth bearer token to the Gemini API. The default model is `gemma-4-26b-a4b-it`; set `GEMMA_MODEL` to another Gemma 4 model supported by the Gemini API.

## Deploy on DigitalOcean App Platform

The App Platform service configuration is in [`.do/app.yaml`](.do/app.yaml). After these changes are pushed to the public GitHub repository, connect it in DigitalOcean App Platform and deploy from this spec. Set `GOOGLE_CLOUD_PROJECT` in the service environment and configure a Google-approved ADC identity for the deployed workload. Local `gcloud` credentials do not transfer to DigitalOcean; do not upload your personal ADC file or commit any credential file. If your organization has not approved workload identity federation or another production ADC method for DigitalOcean, keep live AI analysis local and use the sample flow in the hosted demo until your administrator provides an approved identity. App Platform injects the configured `PORT`; the server uses that port automatically. The spec prepares deployment; it does not create a DigitalOcean app by itself.

The source is released under the [MIT License](LICENSE).

## What it does

- Accepts JPG, PNG, and WEBP images up to 10 MB.
- Sends the photo and symptom together to Gemma 4 through the Gemini API.
- Returns a visual summary, risk label, safe next steps, suggested supplies, and a concise professional handoff.
- Uses ADC on the server and does not store uploaded photos.
- Includes a sample case that can be demoed without credentials.

## Safety scope

FixItLocal is an educational first look, not a definitive diagnosis or a substitute for a qualified technician. The model is instructed to avoid live electrical work, gas-line work, bypassing safety features, and unverified part recommendations. Emergency signals in the user's description trigger a hard-coded stop message in the browser. A model can still misunderstand an image or return unsafe information, so users should follow the appliance manual and stop when uncertain.

## Stack

- HTML, CSS, and browser JavaScript
- Node.js built-in HTTP server
- Google Gemini API with Gemma 4 multimodal inference

## Hackathon fit

FixItLocal is designed for the Hacktoberfest Hack Day Montréal × AGEEI **Best Use of Gemma 4** category. It pairs a user's photo with their description and uses Gemma 4's multimodal reasoning as the core of a focused troubleshooting guide. This matches the category's text-and-image and productivity/learning focus. Hosted inference through Gemini API is part of the documented Gemma workflow; the project does not claim local or offline inference.

It also targets the **Best Use of DigitalOcean** category with a DigitalOcean App Platform deployment spec. To demonstrate actual DigitalOcean usage, deploy the public GitHub repository to App Platform and configure an organization-approved ADC identity for its service. The repository uses the MIT open-source license, and Gemma 4 is the open-weight model central to photo-based diagnosis. Together these make the open model and DigitalOcean hosting concrete parts of how the project works.

For the separate Hacktoberfest Open-Source AI Challenge Week 1 “Touch Grass” prompt, FixItLocal aims to make the screen a short step toward a real-world repair. The challenge requires a public GitHub repository, an open-source license, and open-source/open-weight AI as an important part of the project; those are represented here by the GitHub source, MIT license, and Gemma 4 integration.
