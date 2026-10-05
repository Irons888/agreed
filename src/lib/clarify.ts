import type { Clarification, Result } from '../../worker/types';
import { resolveDeadline } from '../../worker/pipeline/dates';

// Answers to clarifications are applied to the existing result: no new recognition, no model call.
// The date logic is the same module the server uses.

export function nameSpeaker(result: Result, speakerId: string, name: string): Result {
  const label = name.trim();
  return {
    ...result,
    speakers: result.speakers.map((s) => (s.id === speakerId ? { ...s, name: label, label } : s)),
    items: result.items.map((item) =>
      item.owner.kind === 'speaker' && item.owner.speaker === speakerId ? { ...item, owner: { ...item.owner, name: label } } : item,
    ),
    clarifications: result.clarifications.flatMap<Clarification>((c) => {
      if (c.kind !== 'speaker_names') return [c];
      const rest = c.speakers.filter((id) => id !== speakerId);
      return rest.length ? [{ ...c, speakers: rest }] : [];
    }),
    outcome: result.outcome === 'clarify' && !result.speakers.some((s) => s.id !== speakerId && !s.name) ? 'result' : result.outcome,
  };
}

export function setRecordingDate(result: Result, iso: string): Result {
  return {
    ...result,
    recordingDate: { date: iso, source: 'user', evidence: null },
    items: result.items.map((item) =>
      item.deadline.raw ? { ...item, deadline: { ...item.deadline, ...resolveDeadline(item.deadline.raw, iso) } } : item,
    ),
    clarifications: result.clarifications.filter((c) => c.kind !== 'recording_date'),
  };
}

export function decideReview(result: Result, itemId: string, agreed: boolean): Result {
  return {
    ...result,
    items: result.items.map((item) =>
      item.id !== itemId
        ? item
        : agreed
          ? {
              ...item,
              status: 'agreed',
              checks: [...item.checks.filter((c) => c.name !== 'status'), { name: 'status', ok: true, note: 'Confirmed as agreed by you.' }],
            }
          : item,
    ),
    clarifications: result.clarifications.flatMap<Clarification>((c) => {
      if (c.kind !== 'review_items') return [c];
      const rest = c.items.filter((id) => id !== itemId);
      return rest.length ? [{ ...c, items: rest }] : [];
    }),
  };
}

/** Re-applies answers saved in the history when a result is opened again. Same functions, same order of effect. */
export function applyEdits(result: Result, edits: { names?: Record<string, string>; date?: string; reviews?: Record<string, boolean> }): Result {
  let next = result;
  for (const [speakerId, name] of Object.entries(edits.names ?? {})) {
    if (next.speakers.some((s) => s.id === speakerId && !s.name)) next = nameSpeaker(next, speakerId, name);
  }
  if (edits.date && next.clarifications.some((c) => c.kind === 'recording_date')) next = setRecordingDate(next, edits.date);
  for (const [itemId, agreed] of Object.entries(edits.reviews ?? {})) {
    if (next.items.some((i) => i.id === itemId && i.status === 'needs_review')) next = decideReview(next, itemId, agreed);
  }
  return next;
}
