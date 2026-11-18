/**
 * Daymark UI wiring. No AI result is ever faked: every reflection and
 * insight comes from a live Firebase AI Logic call, and failures are shown
 * with their real error message.
 */
import { InferenceMode, type InferenceSource } from "firebase/ai";
import { isConfigured } from "./config";
import { initFirebase, ensureAnonymousUser } from "./firebase";
import {
  getThisWeeksEntries,
  getLatestInsight,
  saveEntry,
  saveReflection,
  saveInsight,
  subscribeToEntries,
  type JournalEntry,
} from "./store";
import {
  prepareDeviceModel,
  probeOnDeviceAvailability,
  reflectOnEntry,
  weeklyInsight,
  type ReflectMode,
} from "./ai";

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const entryText = $("entry-text") as HTMLTextAreaElement;
const wordCount = $("word-count");
const saveState = $("save-state");
const saveBtn = $("save-btn") as HTMLButtonElement;
const reflectBtn = $("reflect-btn") as HTMLButtonElement;
const reflectMode = $("reflect-mode") as HTMLSelectElement;
const prepareBtn = $("prepare-btn") as HTMLButtonElement;
const prepareProgress = $("prepare-progress") as HTMLProgressElement;
const prepareState = $("prepare-state");
const reflectStatus = $("reflect-status");
const reflectionCard = $("reflection-card");
const reflectionSummary = $("reflection-summary");
const reflectionMoods = $("reflection-moods");
const reflectionQuestion = $("reflection-question");
const reflectionNote = $("reflection-note");
const reflectionSource = $("reflection-source");
const reflectionLatency = $("reflection-latency");
const weekCount = $("week-count");
const cloudConsent = $("cloud-consent") as HTMLInputElement;
const insightBtn = $("insight-btn") as HTMLButtonElement;
const insightStatus = $("insight-status");
const insightCard = $("insight-card");
const insightText = $("insight-text");
const insightSource = $("insight-source");
const insightLatency = $("insight-latency");
const historyList = $("history-list") as HTMLOListElement;
const historyEmpty = $("history-empty");
const historyCount = $("history-count");
const firebaseStatus = $("firebase-status");
const deviceStatus = $("device-status");

let uid: string | null = null;
let currentEntryId: string | null = null;
let lastSavedText = "";

function setPill(el: HTMLElement, text: string, kind: string) {
  el.textContent = text;
  el.className = `pill pill-${kind}`;
}

function sourceBadge(
  el: HTMLElement,
  source: InferenceSource | "unknown",
): void {
  if (source === "on_device") {
    el.textContent = "On-device · Gemini Nano";
    el.className = "badge badge-device";
    el.title = "Inference ran on-device (response.inferenceSource = ON_DEVICE)";
  } else if (source === "in_cloud") {
    el.textContent = "Cloud · Gemini Flash";
    el.className = "badge badge-cloud";
    el.title = "Inference ran in the cloud (response.inferenceSource = IN_CLOUD)";
  } else {
    el.textContent = "Source unknown";
    el.className = "badge";
  }
}

function fmtDate(d: Date | null): string {
  if (!d) return "Just now";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function updateWordCount() {
  const words = entryText.value.trim()
    ? entryText.value.trim().split(/\s+/).length
    : 0;
  wordCount.textContent = `${words} word${words === 1 ? "" : "s"}`;
}

function renderHistory(entries: JournalEntry[]) {
  historyCount.textContent = entries.length
    ? `${entries.length} saved`
    : "";
  historyEmpty.hidden = entries.length > 0;
  historyList.replaceChildren();
  for (const e of entries) {
    const li = document.createElement("li");
    li.className = "history-item";

    const head = document.createElement("div");
    head.className = "history-head";
    const date = document.createElement("span");
    date.className = "history-date";
    date.textContent = fmtDate(e.createdAt);
    head.appendChild(date);
    if (e.reflection) {
      const badge = document.createElement("span");
      sourceBadge(
        badge,
        e.reflection.source as InferenceSource | "unknown",
      );
      head.appendChild(badge);
    }
    li.appendChild(head);

    const excerpt = document.createElement("p");
    excerpt.className = "history-excerpt";
    excerpt.textContent =
      e.text.length > 220 ? e.text.slice(0, 220) + "…" : e.text;
    li.appendChild(excerpt);

    if (e.reflection) {
      const refl = document.createElement("p");
      refl.className = "history-reflection";
      refl.textContent = e.reflection.summary;
      li.appendChild(refl);
      if (e.reflection.moods.length > 0) {
        const chips = document.createElement("div");
        chips.className = "chips";
        for (const mood of e.reflection.moods) {
          const chip = document.createElement("span");
          chip.className = "chip";
          chip.textContent = mood;
          chips.appendChild(chip);
        }
        li.appendChild(chips);
      }
    }
    historyList.appendChild(li);
  }
}

async function refreshWeekCount() {
  if (!uid) return;
  try {
    const { db } = initFirebase();
    const entries = await getThisWeeksEntries(db, uid);
    weekCount.textContent =
      entries.length === 0
        ? "No entries in the last 7 days yet"
        : `${entries.length} entr${entries.length === 1 ? "y" : "ies"} in the last 7 days`;
  } catch {
    weekCount.textContent = "";
  }
}

async function saveCurrentEntry(): Promise<string | null> {
  if (!uid) return null;
  const text = entryText.value.trim();
  if (!text) return null;
  if (currentEntryId && text === lastSavedText) return currentEntryId;
  const { db } = initFirebase();
  const id = await saveEntry(db, uid, text);
  currentEntryId = id;
  lastSavedText = text;
  saveState.textContent = "Saved ✓";
  return id;
}

async function onSave() {
  if (!entryText.value.trim()) {
    saveState.textContent = "Write something first.";
    return;
  }
  saveBtn.disabled = true;
  saveState.textContent = "Saving…";
  try {
    await saveCurrentEntry();
    await refreshWeekCount();
  } catch (err) {
    saveState.textContent = `Could not save: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    saveBtn.disabled = false;
  }
}

async function onReflect() {
  const text = entryText.value.trim();
  if (text.length < 20) {
    reflectStatus.textContent =
      "Write at least a few sentences first — reflection needs something to reflect on.";
    return;
  }
  const mode = reflectMode.value as ReflectMode;
  reflectBtn.disabled = true;
  reflectStatus.textContent =
    mode === InferenceMode.ONLY_ON_DEVICE
      ? "Reflecting on-device… (no cloud fallback in Private mode)"
      : "Reflecting…";
  try {
    const { db, ai } = initFirebase();
    if (!uid) throw new Error("Not signed in yet — please wait a moment and retry.");
    // Save first so the reflection has an entry to attach to.
    const entryId = await saveCurrentEntry();
    if (!entryId) throw new Error("Could not save the entry first.");
    const result = await reflectOnEntry(ai, text, mode);    await saveReflection(db, uid, entryId, result);

    reflectionSummary.textContent = result.summary;
    reflectionMoods.replaceChildren();
    for (const mood of result.moods) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = mood;
      reflectionMoods.appendChild(chip);
    }
    reflectionQuestion.textContent = result.question
      ? `To sit with: ${result.question}`
      : "";
    reflectionNote.textContent = result.rawFallback
      ? "The model answered in free text rather than structured JSON, so its raw words are shown above."
      : result.source === "on_device"
        ? "This ran entirely in your browser — your entry never left this device."
        : "Gemini Nano wasn't available here, so Firebase AI Logic fell back to Gemini in the cloud.";
    sourceBadge(reflectionSource, result.source);
    reflectionLatency.textContent = `${(result.latencyMs / 1000).toFixed(1)}s`;
    reflectionCard.hidden = false;
    reflectStatus.textContent = "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    reflectStatus.textContent =
      mode === InferenceMode.ONLY_ON_DEVICE
        ? `On-device reflection failed: ${msg} (Private mode never falls back to the cloud — try Balanced mode, or prepare the on-device model first.)`
        : `Reflection failed: ${msg}`;
  } finally {
    reflectBtn.disabled = false;
  }
}

async function onPrepare() {
  prepareBtn.disabled = true;
  prepareProgress.hidden = false;
  prepareProgress.value = 0;
  prepareState.textContent = "Preparing on-device model…";
  try {
    const { ai } = initFirebase();
    await prepareDeviceModel(ai, (fraction) => {
      prepareProgress.value = fraction;
      prepareState.textContent = `Downloading on-device model… ${Math.round(fraction * 100)}%`;
    });
    setPill(deviceStatus, "On-device AI: ready", "ok");
    prepareState.textContent = "On-device model ready ✓";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    prepareState.textContent = `Could not prepare the on-device model: ${msg}`;
    setPill(deviceStatus, "On-device AI: unavailable", "warn");
  } finally {
    prepareBtn.disabled = false;
    prepareProgress.hidden = true;
  }
}

async function onInsight() {
  if (!cloudConsent.checked) {
    insightStatus.textContent =
      "Please tick the consent box first — the weekly insight sends entries to the cloud.";
    return;
  }
  insightBtn.disabled = true;
  insightStatus.textContent = "Reading your week… (cloud)";
  try {
    const { db, ai } = initFirebase();
    if (!uid) throw new Error("Not signed in yet — please wait a moment and retry.");
    const entries = await getThisWeeksEntries(db, uid);
    if (entries.length < 2) {
      insightStatus.textContent =
        "You need at least 2 entries from the last 7 days for a weekly insight.";
      return;
    }
    const result = await weeklyInsight(
      ai,
      entries.map((e) => ({
        dateLabel: fmtDate(e.createdAt),
        text: e.text,
      })),
    );
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    await saveInsight(db, uid, result, weekStart.toISOString().slice(0, 10));
    insightText.textContent = result.text;
    sourceBadge(insightSource, result.source);
    insightLatency.textContent = `${(result.latencyMs / 1000).toFixed(1)}s · ${result.entryCount} entries`;
    insightCard.hidden = false;
    insightStatus.textContent = "";
  } catch (err) {
    insightStatus.textContent = `Weekly insight failed: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    insightBtn.disabled = false;
  }
}

async function init() {
  $("today-label").textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  entryText.addEventListener("input", () => {
    updateWordCount();
    if (entryText.value.trim() !== lastSavedText) saveState.textContent = "";
  });
  updateWordCount();

  if (!isConfigured) {
    ($("setup-banner") as HTMLElement).hidden = false;
    setPill(firebaseStatus, "Firebase: not configured", "warn");
    setPill(deviceStatus, "On-device AI: needs Firebase setup", "warn");
    for (const btn of [saveBtn, reflectBtn, prepareBtn, insightBtn]) {
      btn.disabled = true;
    }
    return;
  }

  saveBtn.addEventListener("click", onSave);
  reflectBtn.addEventListener("click", onReflect);
  prepareBtn.addEventListener("click", onPrepare);
  insightBtn.addEventListener("click", onInsight);

  try {
    const { auth, db, ai } = initFirebase();
    setPill(firebaseStatus, "Firebase: connecting…", "pending");
    const user = await ensureAnonymousUser(auth);
    uid = user.uid;
    setPill(firebaseStatus, "Firebase: connected", "ok");

    // On-device availability probe (Chrome Prompt API).
    const availability = await probeOnDeviceAvailability();
    if (availability === "available") {
      setPill(deviceStatus, "On-device AI: available", "ok");
    } else if (availability === "downloadable" || availability === "downloading") {
      setPill(deviceStatus, "On-device AI: model download needed", "warn");
    } else if (availability === "not-supported") {
      setPill(deviceStatus, "On-device AI: not in this browser", "warn");
    } else {
      setPill(deviceStatus, `On-device AI: ${availability}`, "warn");
    }
    void ai; // AI service is created lazily per call in ai.ts via initFirebase().

    subscribeToEntries(
      db,
      uid,
      (entries) => {
        renderHistory(entries);
        void refreshWeekCount();
      },
      (err) => {
        historyEmpty.textContent = `Could not load history: ${err.message}`;
        historyEmpty.hidden = false;
      },
    );

    // Show the most recent saved weekly insight, if any.
    try {
      const latest = await getLatestInsight(db, uid);
      if (latest) {
        insightText.textContent = latest.text;
        sourceBadge(insightSource, latest.source as InferenceSource | "unknown");
        insightLatency.textContent = `${(latest.latencyMs / 1000).toFixed(1)}s · ${latest.entryCount} entries · saved ${fmtDate(latest.createdAt)}`;
        insightCard.hidden = false;
      }
    } catch {
      // No saved insight yet — fine.
    }
    await refreshWeekCount();
  } catch (err) {
    setPill(firebaseStatus, "Firebase: error", "bad");
    reflectStatus.textContent = `Firebase setup failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

void init();
