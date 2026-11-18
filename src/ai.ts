/**
 * Hybrid AI: on-device Gemini Nano (Chrome built-in AI) first, cloud Gemini
 * Flash fallback — all through the Firebase AI Logic Hybrid Inference SDK.
 *
 * The split is deliberate and honest:
 * - "Reflect" (short, private, single entry) uses PREFER_ON_DEVICE: when
 *   Gemini Nano is available in desktop Chrome, the entry never leaves the
 *   browser. Otherwise the SDK falls back to the cloud model.
 * - "Weekly insight" (long context across many entries, heavier reasoning)
 *   uses PREFER_IN_CLOUD: it is a cloud-first task by design, with an
 *   explicit user consent checkbox because entries leave the device.
 * - "Private" mode uses ONLY_ON_DEVICE: it throws instead of ever sending
 *   text to the cloud, and the UI says so plainly.
 *
 * Every result reports `response.inferenceSource` (ON_DEVICE / IN_CLOUD) so
 * the user — and the demo — can see exactly where inference happened.
 * Nothing here is simulated: if no model is reachable, the call fails and
 * the UI shows the real error.
 */
import {
  getGenerativeModel,
  InferenceMode,
  Schema,
  type AI,
  type GenerativeModel,
  type InferenceSource,
} from "firebase/ai";

/** Cloud fallback model: the SDK v13+ default (per Firebase docs). */
export const CLOUD_MODEL = "gemini-3.5-flash-lite";

export type ReflectMode =
  | typeof InferenceMode.PREFER_ON_DEVICE
  | typeof InferenceMode.ONLY_ON_DEVICE
  | typeof InferenceMode.PREFER_IN_CLOUD;

export interface Reflection {
  summary: string;
  moods: string[];
  question: string;
  /** "on_device" | "in_cloud" — straight from response.inferenceSource. */
  source: InferenceSource | "unknown";
  latencyMs: number;
  /** True when the JSON parse failed and we fell back to raw text. */
  rawFallback: boolean;
}

export interface WeeklyInsight {
  text: string;
  source: InferenceSource | "unknown";
  latencyMs: number;
  entryCount: number;
}

export const MAX_REFLECT_CHARS = 4000;
export const MAX_WEEKLY_CHARS = 12000;

const REFLECT_SYSTEM_PROMPT =
  "You are a warm, concise journaling companion. You never give medical advice. " +
  "You respond with only a single JSON object, no markdown fences, no extra text.";

const REFLECTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "A gentle 2-3 sentence summary of what the writer experienced and felt.",
    },
    moods: {
      type: "array",
      items: { type: "string" },
      description: "Up to 3 single-word mood tags, lowercase.",
    },
    question: {
      type: "string",
      description:
        "One thoughtful follow-up question the writer could reflect on, at most 20 words.",
    },
  },
  required: ["summary", "moods", "question"],
} as const;

const reflectionSchema = Schema.object({
  properties: {
    summary: Schema.string({
      description:
        "A gentle 2-3 sentence summary of what the writer experienced and felt.",
    }),
    moods: Schema.array({
      items: Schema.string(),
      minItems: 1,
      maxItems: 3,
    }),
    question: Schema.string({
      description:
        "One thoughtful follow-up question the writer could reflect on, at most 20 words.",
    }),
  },
});

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

/** Build (and cache) a hybrid reflection model for the chosen inference mode. */
const reflectModels = new Map<ReflectMode, GenerativeModel>();

export function getReflectModel(ai: AI, mode: ReflectMode): GenerativeModel {
  const cached = reflectModels.get(mode);
  if (cached) return cached;
  const model = getGenerativeModel(ai, {
    mode,
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        initialPrompts: [
          {
            role: "system",
            content: [{ type: "text", value: REFLECT_SYSTEM_PROMPT }],
          },
        ],
      },
      // Chrome Prompt API JSON constraint for on-device structured output.
      promptOptions: { responseConstraint: REFLECTION_JSON_SCHEMA },
    },
    inCloudParams: {
      model: CLOUD_MODEL,
      systemInstruction: REFLECT_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: reflectionSchema,
        maxOutputTokens: 512,
        temperature: 0.7,
      },
    },
  });
  reflectModels.set(mode, model);
  return model;
}

let insightModel: GenerativeModel | null = null;

/** Weekly insight model: cloud-first (long context, heavier reasoning). */
export function getInsightModel(ai: AI): GenerativeModel {
  if (insightModel) return insightModel;
  insightModel = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_IN_CLOUD,
    inCloudParams: {
      model: CLOUD_MODEL,
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
      },
    },
  });
  return insightModel;
}

/**
 * Initialize (and if needed, download) the on-device model. MUST be called
 * from a user gesture (button click). Resolves when the model is ready;
 * rejects if the browser cannot provide an on-device model.
 */
export async function prepareDeviceModel(
  ai: AI,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const model = getReflectModel(ai, InferenceMode.PREFER_ON_DEVICE);
  await model.initializeDeviceModel(onProgress);
}

function parseReflectionJson(raw: string): {
  summary: string;
  moods: string[];
  question: string;
} | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    const parsed = JSON.parse(cleaned) as {
      summary?: unknown;
      moods?: unknown;
      question?: unknown;
    };
    if (
      typeof parsed.summary === "string" &&
      Array.isArray(parsed.moods) &&
      parsed.moods.every((m) => typeof m === "string") &&
      typeof parsed.question === "string"
    ) {
      return {
        summary: parsed.summary,
        moods: parsed.moods.slice(0, 3),
        question: parsed.question,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Reflect on a single journal entry (single-turn text generation). */
export async function reflectOnEntry(
  ai: AI,
  entryText: string,
  mode: ReflectMode,
): Promise<Reflection> {
  const model = getReflectModel(ai, mode);
  const entry = truncate(entryText.trim(), MAX_REFLECT_CHARS);
  const prompt =
    "Read the journal entry below and respond with ONLY a JSON object " +
    'with this shape: {"summary": "<2-3 sentence gentle summary>", ' +
    '"moods": ["<up to 3 single-word mood tags, lowercase>"], ' +
    '"question": "<one thoughtful follow-up question, at most 20 words>"}. ' +
    "Do not include markdown fences or any text outside the JSON object.\n\n" +
    `Journal entry:\n"""${entry}"""`;

  const started = performance.now();
  const result = await model.generateContent(prompt);
  const latencyMs = Math.round(performance.now() - started);
  const source = result.response.inferenceSource ?? "unknown";
  const raw = result.response.text();

  const parsed = parseReflectionJson(raw);
  if (parsed) {
    return { ...parsed, source, latencyMs, rawFallback: false };
  }
  // Honest fallback: the model answered, but not as parseable JSON.
  // Show its raw words instead of failing or inventing structure.
  return {
    summary: raw,
    moods: [],
    question: "",
    source,
    latencyMs,
    rawFallback: true,
  };
}

/** Weekly insight across several entries (cloud-first by design). */
export async function weeklyInsight(
  ai: AI,
  entries: { dateLabel: string; text: string }[],
): Promise<WeeklyInsight> {
  const model = getInsightModel(ai);
  let combined = "";
  for (const e of entries) {
    const block = `--- ${e.dateLabel} ---\n${e.text}\n`;
    if (combined.length + block.length > MAX_WEEKLY_CHARS) break;
    combined += block;
  }
  const prompt =
    "You are a thoughtful journaling companion. Below are this week's journal " +
    "entries, oldest first. Write a short weekly insight (150-250 words) in plain " +
    "text: name 1-2 recurring themes or patterns, note any shift in mood or energy " +
    "across the week, and close with one kind, concrete suggestion for the coming " +
    "week. Be warm and specific; quote a short phrase from the entries when it helps. " +
    "Do not give medical advice.\n\n" +
    combined;

  const started = performance.now();
  const result = await model.generateContent(prompt);
  const latencyMs = Math.round(performance.now() - started);
  return {
    text: result.response.text(),
    source: result.response.inferenceSource ?? "unknown",
    latencyMs,
    entryCount: entries.length,
  };
}

/** Probe Chrome's built-in Prompt API availability for the status panel. */
export async function probeOnDeviceAvailability(): Promise<string> {
  const lm = (window as unknown as {
    LanguageModel?: { availability: () => Promise<string> };
  }).LanguageModel;
  if (!lm || typeof lm.availability !== "function") {
    return "not-supported";
  }
  try {
    return await lm.availability();
  } catch {
    return "unknown";
  }
}
