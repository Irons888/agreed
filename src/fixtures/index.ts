import type { Item, Result } from '../../worker/types';
import t1 from './t1-result.json';
import t3 from './t3-result.json';
import t4 from './t4-result.json';
import t5 from './t5-result.json';

// Real results from the final eval on the live deployment (eval/results/2026-10-05T21-36-32-844Z), not hand-written.
export const t1Result = t1 as unknown as Result;
/** Unnamed speakers and hedged statements: the product asks who is who. */
export const t3Result = t3 as unknown as Result;
/** The recording states its date, so deadlines become calendar dates. */
export const t4Result = t4 as unknown as Result;
/** Three voices: the product declines. */
export const t5Result = t5 as unknown as Result;

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

export const datedItem: Item = t4Result.items.find((i) => i.deadline.kind === 'date' && i.owner.kind === 'speaker')!;

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

export const unnamedResult: Result = t3Result;

export const declinedResult: Result = t5Result;

export const emptyResult: Result = { ...t1Result, items: [], clarifications: [] };
