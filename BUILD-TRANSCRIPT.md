# BUILD-TRANSCRIPT.md — Daymark

Build date: 17 Nov 2026 (WIB). Builder: Muse subagent (AI coding assistant).
Hackathon: Firebase #BuildHybridAI 2026, Web/Chrome track.
Deadline: 30 Nov 2026, 22:00 UTC = 1 Dec 2026, 05:00 WIB.

## What was built

**Daymark** — a private journal web app (Vite + TypeScript + Firebase JS SDK
13.4.0, no UI framework) at `~/workspace/firebase-hybridai/`.

- **Reflect** (one entry): hybrid `PREFER_ON_DEVICE` — Gemini Nano on-device
  in desktop Chrome, cloud Gemini Flash fallback. `ONLY_ON_DEVICE` Private
  mode and `PREFER_IN_CLOUD` mode selectable in the UI.
- **Weekly insight**: `PREFER_IN_CLOUD` across the last 7 days' entries,
  behind an explicit cloud-consent checkbox.
- **History**: entries + reflections from Firestore, live-updating, with
  per-result inference-source badges (`ON_DEVICE` / `IN_CLOUD`).
- **Firebase products used**: AI Logic (hybrid inference), Firestore,
  Authentication (anonymous), App Check (reCAPTCHA v3 / debug provider).
- **Structured output on both paths**: `responseSchema` (cloud) +
  Prompt API `responseConstraint` (on-device), with a prompt-instructed JSON
  shape and a graceful raw-text fallback if parsing fails.
- **Honest states everywhere**: setup banner + disabled AI when no Firebase
  config is present; real error messages on failure; no simulated responses.

## Verified live (evidence, not claims)

1. **Free-tier path verified from official docs** (17 Nov 2026):
   - Firebase AI Logic pricing docs: "Using Firebase AI Logic is
     free-of-charge"; Gemini Developer API free tier needs NO billing account
     and runs on the no-cost Spark plan.
   - Devpost page: "text inference with Firebase AI Logic is free within
     usage limits"; the Google Account Quota Form is only for advanced
     features such as image generation. Daymark is text-only, so **no Quota
     Form is needed** (no Sprint 2/3 deadline pressure).
   - Hybrid inference docs (firebase.google.com/docs/ai-logic/
     hybrid-on-device-inference): web SDK v12.5.0+, Chrome desktop 139+,
     `PREFER_ON_DEVICE` / `ONLY_ON_DEVICE` / `PREFER_IN_CLOUD` /
     `ONLY_IN_CLOUD`, `initializeDeviceModel()`, `inferenceSource`,
     default cloud model `gemini-3.5-flash-lite` (SDK v13.0.0+).
2. **SDK API verified against the installed package** (`firebase@13.4.0`,
   `npm view` + `.d.ts` inspection of `@firebase/ai`): `HybridParams`,
   `InferenceMode`, `InferenceSource`, `GenerativeModel.initializeDeviceModel`,
   `LanguageModelPromptOptions.responseConstraint`, `Schema.object/array/
   string`, `ModelParams.generationConfig.responseSchema`. Also verified from
   the App Check SDK source that debug mode exchanges the debug token
   directly without calling the provider.
3. **Strict build passes**: `npm run build` = `tsc -b` (strict, against the
   real SDK types) + `vite build`. Output: 7.95 kB HTML, 5.27 kB CSS,
   397.70 kB JS (gzip 122.11 kB) for the placeholder-config build.
4. **Live-path bundle verified**: a throwaway build with a dummy (non-real)
   config produced a 714,082-byte bundle containing all three inference
   modes, `gemini-3.5-flash-lite`, `inferenceSource` (×14),
   `initializeDeviceModel`, `responseConstraint`, and all app strings.
   (The placeholder-config build correctly tree-shakes the live AI path
   away — Rollup folds `isConfigured === false` — and ships only the setup
   banner path. The throwaway build was deleted after verification.)
5. **Serving verified**: `vite preview` served the production build;
   `curl` returned HTTP 200 for the page (7,951 bytes, "Daymark" ×5) and
   HTTP 200 for the JS bundle; `node --check` passed on the bundle.
6. **No paid step was taken**: $0 spent. No billing enabled, no quota form,
   no subscription. npm packages only (free).

## NOT verified (honest limits — needs a human + a real browser)

- **No end-to-end AI call has run yet.** There is no Firebase project (needs
  a human Google login to create) and no Chrome-with-Nano on this VM, so
  neither the on-device path nor the cloud path has executed a real
  inference. The code paths are type-checked against the real SDK and
  bundle-verified, but the first live inference must happen on the demo
  machine after SETUP.md is followed. Do NOT claim the AI "works" until
  that first run is observed.
- **On-device model download** (~hundreds of MB, needs ~22 GB free disk per
  Chrome docs) has not been exercised.
- **Firestore rules** have not been tested against a live database.
- **App Check debug token flow** has not been exercised end-to-end.
- **GitHub Pages deploy** is pending (see below).

## Still to do (human steps)

1. Create the Firebase project + paste config (SETUP.md steps 1–5). No hard
   deadline, but needed before the demo video can be recorded. Suggested:
   by 20 Nov so there's slack before the 1 Dec 05:00 WIB deadline.
2. Deploy the configured build to GitHub Pages (SETUP.md step 7) and confirm
   the live URL.
3. Record the demo video (≤3 min, YouTube, English) — script in
   SUBMISSION.md. Must show a REAL reflection running (on-device badge if
   Nano is available, otherwise the honest cloud-fallback badge).
4. Submit on Devpost before 1 Dec 2026 05:00 WIB — draft in SUBMISSION.md.

## Files

- `index.html`, `src/{main,ai,firebase,store,config}.ts`, `src/styles.css`,
  `src/vite-env.d.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`,
  `package-lock.json`
- `firestore.rules`, `.gitignore`, `LICENSE` (Apache-2.0),
  `README.md`, `SETUP.md`, `SUBMISSION.md`, `BUILD-TRANSCRIPT.md`
