# Daymark — a private journal that thinks with you

Built for the **Firebase #BuildHybridAI 2026 Hackathon**
([Devpost](https://firebasehybridaihackathon.devpost.com/)) — Web/Chrome track.

Daymark is a private journaling app that shows what hybrid AI is *for*.
Quick, personal reflections run **on-device with Gemini Nano 4** in desktop
Chrome — private, free, and offline. Deeper work, the weekly insight across
many entries, runs **in the cloud with Gemini Flash**. Every answer carries a
badge showing exactly where it ran, straight from the SDK's
`inferenceSource`. No guessing, no simulated AI.

## How the hybrid works

| Task | Route | Why |
|---|---|---|
| **Reflect** on one entry (summary, mood tags, one question) | `PREFER_ON_DEVICE` — Gemini Nano, cloud fallback | Short, private, single-turn. Your words stay in the browser when Nano is available. |
| **Reflect, Private mode** | `ONLY_ON_DEVICE` | Never touches the cloud. Throws honestly if Nano isn't available. |
| **Weekly insight** (themes across 7 days) | `PREFER_IN_CLOUD` — Gemini Flash | Long context, heavier reasoning — a cloud job by design, behind an explicit consent checkbox. |

Implementation notes:

- Firebase AI Logic Hybrid Inference SDK (`firebase/ai`, JS SDK v13.4.0):
  `getGenerativeModel` with `InferenceMode`, `initializeDeviceModel()` with
  download progress, `response.inferenceSource` displayed per result.
- Structured output on both paths: `responseSchema` for the cloud model and
  the Chrome Prompt API `responseConstraint` for the on-device model.
- Other Firebase products: **Firestore** (entries, reflections, insights),
  **Authentication** (anonymous sign-in — no account, no personal data),
  **App Check** (reCAPTCHA v3 on the hosted site, debug provider on
  localhost; debug tokens are explicitly accepted in hackathon submissions).
- Firestore offline persistence is enabled, so entries stay available when
  the on-device path is used offline.
- Everything runs on the **free tier**: Firebase Spark plan (no billing) +
  Gemini Developer API free tier. No Cloud Functions, no Cloud Storage, no
  paid quota. See [SETUP.md](SETUP.md).

## Project status

The app is complete and builds cleanly (strict TypeScript + Vite). It needs
a Firebase project to run the AI — that's a ~15 minute, free, human step
because it requires signing into the Firebase console with a Google account.
See [SETUP.md](SETUP.md). Until a config is pasted in, the app shows a setup
banner and disables saving/AI rather than faking anything.

Live demo (after setup): GitHub Pages link will be added here once deployed.

## Run it

```bash
npm install
npm run dev      # localhost dev server
npm run build    # strict type-check + production build into dist/
npm run preview  # serve the production build locally
```

Requires Node 20+. Chrome 139+ on desktop for the on-device path; enable
`chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` if prompted.

## Repository layout

```
index.html            App shell
src/
  main.ts             UI wiring (no AI result is ever simulated)
  ai.ts               Hybrid inference: reflection + weekly insight
  firebase.ts         App / App Check / Auth / Firestore / AI Logic init
  store.ts            Firestore data layer (per-user subtrees)
  config.ts           Firebase web config (paste yours in — see SETUP.md)
  styles.css          All styling, no framework
firestore.rules       Security rules: users can only touch their own data
SETUP.md              Step-by-step Firebase setup (free, no billing)
BUILD-TRANSCRIPT.md   What was built, what was verified live, honest limits
SUBMISSION.md         Devpost submission draft + demo video script
```

## Disclosure

All application code in this repository was written during the hackathon
period (17 Nov 2026) with the help of an AI coding assistant (Muse, Meta's
personal AI agent), which the hackathon rules explicitly allow. No
pre-existing application code was reused. Third-party libraries (Firebase JS
SDK, Vite, TypeScript) are used as documented dependencies, not as
pre-existing project code.

## License

Apache-2.0 — see [LICENSE](LICENSE).
