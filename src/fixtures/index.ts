import type { Item, Result } from '../../worker/types';
import t1 from './t1-result.json';

/** A real result: T1 processed by the live pipeline (eval run), not hand-written. */
export const t1Result = t1 as unknown as Result;

const byTitle = (word: string) => t1Result.items.find((i) => i.title.toLowerCase().includes(word))!;
export const agreedItem = byTitle('api');
export const changedItem = byTitle('staging');
export const noOwnerItem = byTitle('privacy');
export const questionItem = byTitle('sign');
export const notAcceptedItem = byTitle('dark');
export const cancelledItem = byTitle('meeting');

// Variants that T1 doesn't contain, derived from real items so quotes and times stay real.
export const needsReviewItem: Item = {
  ...agreedItem,
  id: 'variant-needs-review',
  status: 'needs_review',
  title: 'Send the API docs (hedged)',
  owner: { kind: 'speaker', speaker: 'S2', name: 'Mark', how: 'tentative' },
  checks: agreedItem.checks.map((c) => (c.name === 'status' ? { ...c, ok: false, note: 'The commitment is hedged: “I\'ll try to send them, no promises.”' } : c)),
};

export const datedItem: Item = {
  ...agreedItem,
  id: 'variant-dated',
  deadline: { kind: 'date', raw: 'by Wednesday', date: '2026-10-07', ambiguous: false, previous: [] },
};

export const ambiguousDateItem: Item = {
  ...agreedItem,
  id: 'variant-ambiguous',
  deadline: { kind: 'date', raw: 'next Wednesday', date: '2026-10-14', ambiguous: true, previous: [] },
};

export const namedOwnerItem: Item = {
  ...noOwnerItem,
  id: 'variant-named',
  owner: { kind: 'named', name: 'Lisa' },
};

export const correctedOwnerItem: Item = {
  ...noOwnerItem,
  id: 'variant-corrected',
  checks: noOwnerItem.checks.map((c) =>
    c.name === 'owner' ? { ...c, ok: false, note: 'Owner removed: the quotes show no commitment by Mark and no request that Mark accepted.' } : c,
  ),
};

export const unnamedResult: Result = {
  ...t1Result,
  outcome: 'clarify',
  speakers: t1Result.speakers.map((s) => ({ ...s, name: null, label: `Speaker ${s.id.slice(1)}`, intro: null })),
  items: t1Result.items.map((i) => (i.owner.kind === 'speaker' ? { ...i, owner: { ...i.owner, name: `Speaker ${i.owner.speaker.slice(1)}` } } : i)),
  clarifications: [{ kind: 'speaker_names', blocking: true, speakers: ['S1', 'S2'] }, ...t1Result.clarifications],
};

export const declinedResult: Result = {
  ...t1Result,
  outcome: 'decline',
  decline: { reason: 'too_many_voices', message: 'More than two voices were detected. This prototype supports conversations between two people.' },
  speakers: [...t1Result.speakers, { id: 'S3', name: null, label: 'Speaker 3', words: 18, intro: null }],
  items: [],
  clarifications: [],
};

export const emptyResult: Result = { ...t1Result, items: [], clarifications: [] };
