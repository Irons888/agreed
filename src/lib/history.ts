import { useSyncExternalStore } from 'react';
import type { Deadline, Owner, Result, Status } from '../../worker/types';
import { decidingEvidence } from './evidence';
import { calendarDate, spoken } from './format';

// There are no accounts, so the history of analysed recordings lives in this browser.
// It keeps a short summary of each result (no transcript) and the answers to clarifications,
// which are re-applied when the result is opened again. The results themselves stay on the server for 30 days.

/** One item as the Tasks board needs it. The optional fields came later, so older entries may not have them. */
export type TaskSummary = {
  id: string;
  title: string;
  status: Status;
  owner: string | null;
  deadline: string | null;
  at: number;
  /** The words that decide the item, to play them from the board. */
  quote?: { text: string; start: number; end: number };
  /** ISO date, when the deadline is on the calendar. */
  due?: string | null;
  /** A weekday or "tomorrow" said in a call whose date is unknown. */
  dateUnknown?: boolean;
  /** The deadline's wording as said, to start an edit from. */
  deadlineRaw?: string | null;
  /** The voice that owns the task (S1, S2…), so naming the voice can update it. */
  ownerSpeaker?: string;
};

/** A change made on the Tasks board. Missing fields stay as in the call; null clears the owner or the deadline. */
export type TaskEdit = { title?: string; owner?: string | null; deadline?: string | null; due?: string | null };

/** Answers given on the result page (speaker names, the call date, review decisions) and tasks ticked off on the board. */
export type Edits = {
  names?: Record<string, string>;
  date?: string;
  reviews?: Record<string, boolean>;
  done?: Record<string, boolean>;
  /** The board's working copy of a task; the result page keeps showing what the call supports. */
  tasks?: Record<string, TaskEdit>;
};

export type HistoryEntry = {
  id: string;
  fileName: string;
  createdAt: string;
  durationSec: number;
  outcome: Result['outcome'];
  /** Why the product declined, for declined recordings. */
  note: string | null;
  items: TaskSummary[];
  edits: Edits;
};

const KEY = 'agreed.history.v1';
const CHANGED = 'agreed-history-changed';
export const RETENTION_DAYS = 30;

let cache: HistoryEntry[] | null = null;

function load(): HistoryEntry[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    cache = Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function save(list: HistoryEntry[]) {
  cache = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Private mode or full storage: the history lasts as long as this tab.
  }
  window.dispatchEvent(new Event(CHANGED));
}

const ownerLabel = (owner: Owner) => (owner.kind === 'none' ? null : owner.name);
function deadlineLabel(d: Deadline): string | null {
  if (d.kind === 'none' || !d.raw) return null;
  const said = d.date ? `${calendarDate(d.date)}, ${spoken(d.raw)}` : spoken(d.raw);
  return d.previous.length ? `${said}, moved from ${d.previous.map(spoken).join(', ')}` : said;
}

function summarize(result: Result, fileName: string, edits: Edits): HistoryEntry {
  return {
    id: result.id,
    fileName,
    createdAt: result.createdAt,
    durationSec: result.durationSec,
    outcome: result.outcome,
    note: result.decline?.message ?? null,
    items: result.items.map((item) => {
      const quote = decidingEvidence(item);
      return {
        id: item.id,
        title: item.title,
        status: item.status,
        owner: ownerLabel(item.owner),
        deadline: deadlineLabel(item.deadline),
        at: quote.start,
        quote: { text: quote.quote, start: quote.start, end: quote.end },
        due: item.deadline.date,
        dateUnknown: item.deadline.kind === 'relative' && !item.deadline.date,
        deadlineRaw: item.deadline.raw,
        ownerSpeaker: item.owner.kind === 'speaker' ? item.owner.speaker : undefined,
      };
    }),
    edits,
  };
}

/** Adds a result to the history or refreshes its summary; earlier answers are kept. */
export function rememberRun(result: Result, fileName: string) {
  const list = load();
  const edits = list.find((e) => e.id === result.id)?.edits ?? {};
  save([...list.filter((e) => e.id !== result.id), summarize(result, fileName, edits)]);
}

/** Stores an answer and the result it produced. */
export function rememberEdit(result: Result, fileName: string, change: Edits) {
  const list = load();
  const old = list.find((e) => e.id === result.id)?.edits ?? {};
  const edits: Edits = {
    ...old,
    names: { ...old.names, ...change.names },
    date: change.date ?? old.date,
    reviews: { ...old.reviews, ...change.reviews },
  };
  save([...list.filter((e) => e.id !== result.id), summarize(result, fileName, edits)]);
}

export const editsFor = (id: string): Edits => load().find((e) => e.id === id)?.edits ?? {};

function updateEntry(id: string, change: (entry: HistoryEntry) => HistoryEntry) {
  save(load().map((e) => (e.id === id ? change(e) : e)));
}

/** Ticks a task off, or marks a question answered, on the Tasks board. */
export function setDone(runId: string, itemId: string, done: boolean) {
  updateEntry(runId, (e) => ({ ...e, edits: { ...e.edits, done: { ...e.edits.done, [itemId]: done } } }));
}

/** Names a voice from the board: the same answer the result page stores, so the call shows the name too. */
export function nameVoice(runId: string, speakerId: string, name: string) {
  const label = name.trim();
  if (!label) return;
  updateEntry(runId, (e) => ({
    ...e,
    edits: { ...e.edits, names: { ...e.edits.names, [speakerId]: label } },
    items: e.items.map((t) => (t.ownerSpeaker === speakerId ? { ...t, owner: label } : t)),
  }));
}

/** Saves the board's version of a task, or drops it with null to go back to what the call said. */
export function editTask(runId: string, itemId: string, edit: TaskEdit | null) {
  updateEntry(runId, (e) => {
    const tasks = { ...e.edits.tasks };
    if (edit && Object.keys(edit).length) tasks[itemId] = edit;
    else delete tasks[itemId];
    return { ...e, edits: { ...e.edits, tasks } };
  });
}

/** "Count as agreed" on the board: the same answer the result page stores, so the result shows it too. */
export function confirmTask(runId: string, itemId: string) {
  updateEntry(runId, (e) => ({
    ...e,
    edits: { ...e.edits, reviews: { ...e.edits.reviews, [itemId]: true } },
    items: e.items.map((t) => (t.id === itemId && t.status === 'needs_review' ? { ...t, status: 'agreed' } : t)),
  }));
}

export function forgetRun(id: string) {
  save(load().filter((e) => e.id !== id));
}

export const isExpired = (entry: HistoryEntry) => Date.now() - Date.parse(entry.createdAt) > RETENTION_DAYS * 24 * 3600 * 1000;

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    onChange();
  };
  window.addEventListener(CHANGED, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** The history, newest first, kept in sync across tabs. */
export function useHistory(): HistoryEntry[] {
  return useSyncExternalStore(subscribe, load, () => []);
}
