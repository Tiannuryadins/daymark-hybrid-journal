/**
 * Firestore data layer. All data lives under the anonymous user's own
 * subtree (`users/{uid}/...`) and is protected by firestore.rules so a user
 * can only read/write their own documents.
 */
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";
import type { Reflection, WeeklyInsight } from "./ai";

export interface JournalEntry {
  id: string;
  text: string;
  createdAt: Date | null;
  reflection: StoredReflection | null;
}

export interface StoredReflection {
  summary: string;
  moods: string[];
  question: string;
  source: string;
  latencyMs: number;
  createdAt: Date | null;
}

export interface StoredInsight {
  id: string;
  text: string;
  source: string;
  latencyMs: number;
  entryCount: number;
  createdAt: Date | null;
}

interface EntryDoc {
  text: string;
  createdAt?: Timestamp;
  reflection?: {
    summary: string;
    moods: string[];
    question: string;
    source: string;
    latencyMs: number;
    createdAt?: Timestamp;
  };
}

function entriesRef(db: Firestore, uid: string) {
  return collection(db, "users", uid, "entries");
}

function insightsRef(db: Firestore, uid: string) {
  return collection(db, "users", uid, "insights");
}

export async function saveEntry(
  db: Firestore,
  uid: string,
  text: string,
): Promise<string> {
  const ref = await addDoc(entriesRef(db, uid), {
    text,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function saveReflection(
  db: Firestore,
  uid: string,
  entryId: string,
  reflection: Reflection,
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "entries", entryId), {
    reflection: {
      summary: reflection.summary,
      moods: reflection.moods,
      question: reflection.question,
      source: reflection.source,
      latencyMs: reflection.latencyMs,
      createdAt: serverTimestamp(),
    },
  });
}

export async function saveInsight(
  db: Firestore,
  uid: string,
  insight: WeeklyInsight,
  weekStartISO: string,
): Promise<string> {
  const ref = await addDoc(insightsRef(db, uid), {
    text: insight.text,
    source: insight.source,
    latencyMs: insight.latencyMs,
    entryCount: insight.entryCount,
    weekStart: weekStartISO,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

function toEntry(id: string, data: EntryDoc): JournalEntry {
  return {
    id,
    text: data.text,
    createdAt: data.createdAt ? data.createdAt.toDate() : null,
    reflection: data.reflection
      ? {
          summary: data.reflection.summary,
          moods: data.reflection.moods ?? [],
          question: data.reflection.question ?? "",
          source: data.reflection.source,
          latencyMs: data.reflection.latencyMs,
          createdAt: data.reflection.createdAt
            ? data.reflection.createdAt.toDate()
            : null,
        }
      : null,
  };
}

/** Live subscription to the newest entries (newest first). */
export function subscribeToEntries(
  db: Firestore,
  uid: string,
  onEntries: (entries: JournalEntry[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(entriesRef(db, uid), orderBy("createdAt", "desc"), limit(30));
  return onSnapshot(
    q,
    (snap) => {
      onEntries(
        snap.docs.map((d) => toEntry(d.id, d.data() as EntryDoc)),
      );
    },
    (err) => onError(err),
  );
}

/** Entries from the last 7 days, oldest first (for the weekly insight). */
export async function getThisWeeksEntries(
  db: Firestore,
  uid: string,
): Promise<JournalEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const q = query(
    entriesRef(db, uid),
    where("createdAt", ">=", since),
    orderBy("createdAt", "asc"),
    limit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toEntry(d.id, d.data() as EntryDoc));
}

/** Most recent saved weekly insight, if any. */
export async function getLatestInsight(
  db: Firestore,
  uid: string,
): Promise<StoredInsight | null> {
  const q = query(insightsRef(db, uid), orderBy("createdAt", "desc"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data() as {
    text: string;
    source: string;
    latencyMs: number;
    entryCount: number;
    createdAt?: Timestamp;
  };
  return {
    id: d.id,
    text: data.text,
    source: data.source,
    latencyMs: data.latencyMs,
    entryCount: data.entryCount,
    createdAt: data.createdAt ? data.createdAt.toDate() : null,
  };
}
