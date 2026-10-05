import { useSyncExternalStore } from 'react';
import type { Deadline, Owner, Result, Status } from '../../worker/types';
import { decidingEvidence } from './evidence';
import { calendarDate, spoken } from './format';

// There are no accounts, so the history of analysed recordings lives in this browser.
// It keeps a short summary of each result (no transcript) and the answers to clarifications,
// which are re-applied when the result is opened again. The results themselves stay on the server for 30 days.

/** One item as the Tasks page needs it. */
export type TaskSummary = { id: string; title: string; status: Status; owner: string | null; deadline: string | null; at: number };

/** Answers given on the result page: speaker names, the call date, review decisions. */
export type Edits = { names?: Record<string, string>; date?: string; reviews?: Record<string, boolean> };

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
    items: result.items.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      owner: ownerLabel(item.owner),
      deadline: deadlineLabel(item.deadline),
      at: decidingEvidence(item).start,
    })),
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
    names: { ...old.names, ...change.names },
    date: change.date ?? old.date,
    reviews: { ...old.reviews, ...change.reviews },
  };
  save([...list.filter((e) => e.id !== result.id), summarize(result, fileName, edits)]);
}

export const editsFor = (id: string): Edits => load().find((e) => e.id === id)?.edits ?? {};

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
