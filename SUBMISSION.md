# SUBMISSION.md — Devpost draft for Daymark

Hackathon: **#BuildHybridAI 2026** — <https://firebasehybridaihackathon.devpost.com/>
Platform: **Web (Chrome)**. Deadline: **30 Nov 2026, 22:00 UTC = 1 Dec 2026, 05:00 WIB**.
Status: **DRAFT — do not submit until the Firebase setup + live demo are done**
(see checklist at the bottom).

## Title

**Daymark — a private journal that thinks with you**

## Tagline

Quick reflections run on-device with Gemini Nano; deeper weekly insights
fall back to Gemini in the cloud. Every answer shows exactly where it ran.

## Description (paste into Devpost)

### Inspiration

A journal is the most private thing most people write — and the worst fit
for cloud-only AI. Sending your innermost thoughts to a server just to get a
two-sentence summary feels wrong, yet the reflection is genuinely useful.
Hybrid inference fixes the tradeoff: the quick, personal work can happen
entirely in the browser, and only the heavy, long-context work needs the
cloud.

### What it does

Daymark is a private journal with hybrid AI, built on Firebase AI Logic:

- **Reflect** — write an entry and get a gentle 2–3 sentence summary, mood
  tags, and one thoughtful question. It runs on-device with Gemini Nano 4 in
  desktop Chrome when available, and Firebase AI Logic falls back to Gemini
  Flash in the cloud when it isn't. A **Private mode** (`ONLY_ON_DEVICE`)
  never touches the cloud at all.
- **Weekly insight** — a longer look across the last 7 days: recurring
  themes, mood shifts, one kind suggestion. Long context is a cloud job, so
  it runs cloud-first behind an explicit consent checkbox.
- **History** — entries, reflections, and insights stored in Firestore under
  an anonymous account, live-updating, each result badged
  **On-device · Gemini Nano** or **Cloud · Gemini Flash** from the SDK's
  `inferenceSource`.
- Works offline for the on-device path (Firestore offline persistence), and
  costs nothing to run: Spark plan + Gemini Developer API free tier.

### How I built it

Web app (Vite + TypeScript, no UI framework) using the Firebase AI Logic
Hybrid Inference SDK for Web (`firebase/ai` v13.4.0): `getGenerativeModel`
with `InferenceMode.PREFER_ON_DEVICE` / `ONLY_ON_DEVICE` /
`PREFER_IN_CLOUD`, `initializeDeviceModel()` with download progress, and
`response.inferenceSource` surfaced in the UI. Structured output on both
paths — `responseSchema` for the cloud model and the Chrome Prompt API
`responseConstraint` for the on-device model. Other Firebase products:
Firestore, Anonymous Auth, and App Check (reCAPTCHA v3 on the hosted site,
debug provider locally).

### Challenges

The honest one: hybrid means two runtimes with different capabilities, and
the app has to be truthful about which one answered. Every result shows its
real inference source, errors are shown with their real messages, and when
Firebase isn't configured the app says so instead of faking a demo.

### What's next

Multi-day streaks and gentle prompts, export of entries, and an Android
build so the same hybrid SDK covers a second platform.

## Links (fill in before submitting)

- Repository: https://github.com/Tiannuryadins/daymark-hybrid-journal
- Live demo: https://tiannuryadins.github.io/daymark-hybrid-journal/
  (after GitHub Pages deploy — see SETUP.md step 7)
- Demo video: _(YouTube link — record after setup, script below)_

## Pre-existing code disclosure (Devpost requires honesty here)

No pre-existing application code was used. All app code was written during
the hackathon period (17 Nov 2026) with the help of an AI coding assistant
(Muse, Meta's personal AI agent) — explicitly allowed by the rules.
Third-party libraries (Firebase JS SDK, Vite, TypeScript) are standard
dependencies, not pre-existing project code.

## Demo video script (≤3 min, English, YouTube)

Total target ~2:30. Record in desktop Chrome 139+ with the on-device model
already downloaded (click "Prepare on-device model" before recording).

| Time | Shot | Narration |
|---|---|---|
| 0:00–0:15 | App open, title + status pills | "This is Daymark — a private journal that thinks with you. It runs its AI two ways: on your device, and in the cloud." |
| 0:15–0:45 | Type a short journal entry (2–3 sentences, real words) | "I write an entry — just a few honest sentences about my day." |
| 0:45–1:20 | Click "Reflect privately"; reflection appears with the **On-device · Gemini Nano** badge | "Reflection runs on-device with Gemini Nano, right here in Chrome. My words never left this browser — and the badge proves it." |
| 1:20–1:40 | Switch the mode dropdown to Private, reflect again (or show the mode options) | "Private mode uses only the on-device model — it would rather fail than send my journal to the cloud." |
| 1:40–2:10 | Tick the consent box, click "Generate weekly insight"; insight appears with the **Cloud · Gemini Flash** badge | "The weekly insight is the heavy job — seven days of entries — so it goes to Gemini in the cloud, with my explicit consent." |
| 2:10–2:30 | Scroll the History panel; close on the repo link | "Everything is saved in Firestore under an anonymous account. Daymark: private by default, powerful when it matters. Built with Firebase AI Logic." |

**If Nano is unavailable on the recording machine**: do NOT fake the
on-device badge. Record the honest cloud-fallback badge instead and narrate:
"Nano isn't available on this machine, so Firebase AI Logic fell back to the
cloud — same feature, same app." A truthful fallback demo beats a staged one.

## Pre-submit checklist

- [ ] Firebase project created, config pasted, app rebuilt (SETUP.md 1–5)
- [ ] At least one REAL reflection observed in the browser (note which badge
      it showed: on-device or cloud)
- [ ] At least one REAL weekly insight observed (needs ≥2 entries, 7 days)
- [ ] App Check working (no App Check errors in console)
- [ ] Firestore rules published; history loads from the live database
- [ ] Deployed to GitHub Pages; live URL tested in a fresh browser profile
- [ ] Demo video recorded (≤3 min, English, public on YouTube)
- [ ] Repo is public, Apache-2.0 LICENSE visible, README complete
- [ ] Devpost form filled: title, description, repo URL, demo URL, video URL,
      platform = Web (Chrome)
- [ ] Submit before **1 Dec 2026, 05:00 WIB**
