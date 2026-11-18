# SETUP.md — Connect Daymark to Firebase (free, ~15 minutes, no billing)

Everything here uses the **free tier only**. Do NOT enable billing or upgrade
to the Blaze plan — this app is designed to run entirely on the no-cost
**Spark plan** + the **Gemini Developer API free tier**.

> Why is this a human step? Creating a Firebase project requires signing into
> the Firebase console with a Google account. An agent can't do that login.

## Step 1 — Create the Firebase project

1. Go to <https://console.firebase.google.com> and sign in with your Google account.
2. Click **Add project** (or **Create a project**), name it e.g. `daymark-hybrid`.
3. When asked about Google Analytics: **disable it** (not needed).
4. The project is created on the **Spark plan** by default. Confirm in
   Project Settings that the plan says **Spark** — do not upgrade.

## Step 2 — Enable Firebase AI Logic (Gemini Developer API)

1. In the console, go to **AI Services > AI Logic** (left sidebar, under
   Build) and click **Get started**.
2. When asked to choose a Gemini API provider, select **Gemini Developer
   API** — this is the free-tier path that needs no billing account.
3. Complete the guided workflow. It automatically enables the required APIs
   and **enforces Firebase App Check for AI Logic** (this is expected —
   Step 5 covers it).

## Step 3 — Register the web app and paste the config

1. In Project Overview, click **</> Add app** and choose **Web**.
2. Register the app (nickname e.g. `daymark-web`). You do NOT need to set up
   Firebase Hosting here.
3. Copy the `firebaseConfig` object shown, and paste its values into
   `src/config.ts` in this repo (replace the `YOUR_*` placeholders).
4. Rebuild: `npm run build`.

## Step 4 — Enable Anonymous Auth + Firestore

1. **Authentication**: Build > Authentication > Get started > Sign-in method >
   enable **Anonymous**. (No other method is needed.)
2. **Firestore Database**: Build > Firestore Database > Create database >
   start in **production mode**, pick a location (e.g. `asia-southeast1`
   Singapore, closest to Indonesia).
3. **Rules**: in Firestore Database > Rules, replace the rules with the
   contents of `firestore.rules` in this repo, then **Publish**.

## Step 5 — App Check (protects the Gemini API)

AI Logic enforces App Check. Two options — pick one:

**Option A — Debug token (simplest, explicitly accepted in hackathon submissions):**
1. Run the app once (`npm run dev` or the deployed site) and open the browser
   console. You'll see: `Firebase App Check debug token: "xxxxxxxx-xxxx-..."`.
2. In the console, go to **Security > App Check > Apps**, find the web app,
   click the overflow menu (⋮) > **Manage debug tokens** > **Add debug token**,
   paste the token, save.
3. Reload the app. AI calls now work.

**Option B — reCAPTCHA v3 (proper production path, still free):**
1. Go to <https://www.google.com/recaptcha/admin> and register a **v3** site key
   for your demo domain (e.g. `tiannuryadins.github.io`).
2. In the Firebase console, **Security > App Check > Apps** > register the
   web app with reCAPTCHA v3 using that site key.
3. Paste the site key into `recaptchaSiteKey` in `src/config.ts` and rebuild.

Note: on `localhost` the app always uses the debug provider (Option A flow).

## Step 6 — Prepare Chrome for on-device inference (demo machine)

On the machine that records the demo video / is judged:

1. Use **Chrome on Desktop, version 139 or higher**
   (`chrome://settings/help` to check/update).
2. Enable the flag `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
   and restart Chrome.
3. In the app, click **Prepare on-device model** once — the first run
   downloads Gemini Nano (~hundreds of MB) in the background with a progress
   bar. After that, reflections run on-device.
4. If Nano can't download (old hardware, low disk), the app still works:
   reflections fall back to the cloud and the badge says so honestly.

## Step 7 — Deploy the demo (GitHub Pages, free)

```bash
npm run build
# push the contents of dist/ to the `gh-pages` branch of this repo, then:
# GitHub repo > Settings > Pages > Source: Deploy from a branch > gh-pages
```

The live URL will be `https://tiannuryadins.github.io/daymark-hybrid-journal/`.

## Quota notes (free tier)

- Gemini Developer API free tier: rate-limited per minute/day; plenty for a
  demo and judging. If the cloud path ever returns a quota error, wait and
  retry — or use the on-device path, which has no cloud quota at all.
- Firestore Spark quota: 50k reads / 20k writes per day — far above what a
  journal demo needs.
- The hackathon's optional **Google Account Quota Form is NOT needed** for
  this app: it only covers advanced features such as image generation, and
  Daymark is text-only. No form, no 4-day account, no fees beyond quota.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Setup banner shows, buttons disabled | `src/config.ts` still has placeholders | Paste the real config (Step 3) and rebuild |
| AI calls fail with App Check error | Debug token not registered / wrong provider | Step 5 — check the console for the debug token |
| "On-device AI: not in this browser" | Not desktop Chrome 139+, or flag off | Step 6 |
| Reflection works but badge says Cloud | Nano not downloaded / unavailable here | Click "Prepare on-device model"; check disk space (needs ~22 GB free per Chrome docs) |
| Firestore permission denied | Rules not published | Step 4.3 — publish `firestore.rules` |
