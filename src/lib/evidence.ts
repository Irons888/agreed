import type { Evidence, EvidenceRole, Item, Status } from '../../worker/types';

const DECIDING: Record<Status, EvidenceRole[]> = {
  agreed: ['acceptance', 'commitment'],
  cancelled: ['cancellation'],
  not_accepted: ['rejection', 'proposal'],
  open_question: ['question'],
  needs_review: ['hedge', 'commitment', 'acceptance'],
};

const words = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

/**
 * The quote that decides the final state, shown first on the card: the cancellation, the question,
 * and for a task the latest agreement. A bare "Perfect, thanks" can count as an acceptance, so among
 * agreements the one that says the final deadline wins, then the owner's own words.
 */
export function decidingEvidence(item: Item): Evidence {
  const roles = DECIDING[item.status];
  const latestFirst = [...item.evidence].reverse();
  if (item.status === 'agreed' || item.status === 'needs_review') {
    const candidates = latestFirst.filter((e) => roles.includes(e.role));
    const deadline = item.deadline.raw ? words(item.deadline.raw) : null;
    const owner = item.owner.kind === 'speaker' ? item.owner.speaker : null;
    const pick =
      (deadline && candidates.find((e) => words(e.quote).includes(deadline))) ||
      (owner && candidates.find((e) => e.speaker === owner)) ||
      candidates.find((e) => e.role === roles[0]) ||
      candidates[0];
    if (pick) return pick;
  }
  for (const role of roles) {
    const found = latestFirst.find((e) => e.role === role);
    if (found) return found;
  }
  return item.evidence[item.evidence.length - 1];
}
