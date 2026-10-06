import type { Check, Deadline, Evidence, EvidenceRole, Item, Owner, Speaker, Status, Turn } from '../types';
import { ADDRESSED, AFFIRMATIVE, COMMITMENT, DIRECT_ANSWER, FILLER, FIRST_PERSON, HEDGE, UNKNOWN, containsPhrase, normalize, tokens } from '../lib/text';
import type { LlmItem, LlmOutput } from './extract';
import { checkAnchor, resolveDeadline } from './dates';

// Everything the model claims is checked here against the transcript. Quotes are replaced by the
// transcript's own words, times come from speech recognition, and statuses, owners and deadlines
// that the quotes don't support are downgraded or removed, with a note saying why.

type IndexedTurn = Turn & { tokens: string[]; tokenWord: number[] };
type Index = Map<string, IndexedTurn>;

function indexTurns(turns: Turn[]): Index {
  const index: Index = new Map();
  for (const turn of turns) {
    const turnTokens: string[] = [];
    const tokenWord: number[] = [];
    turn.words.forEach((word, i) => {
      for (const token of tokens(word.text)) {
        turnTokens.push(token);
        tokenWord.push(i);
      }
    });
    index.set(turn.id, { ...turn, tokens: turnTokens, tokenWord });
  }
  return index;
}

function lcs(a: string[], b: string[]): number {
  const row = new Array(b.length + 1).fill(0);
  for (const x of a) {
    let diagonal = 0;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = x === b[j - 1] ? diagonal + 1 : Math.max(row[j], row[j - 1]);
      diagonal = above;
    }
  }
  return row[b.length];
}

/** Exact contiguous match first; otherwise the closest window with at least 80% of the words in order. */
function locate(turn: IndexedTurn, quote: string[], allowNear: boolean): { from: number; to: number; exact: boolean } | null {
  const t = turn.tokens;
  if (!quote.length || !t.length) return null;
  outer: for (let i = 0; i + quote.length <= t.length; i++) {
    for (let j = 0; j < quote.length; j++) if (t[i + j] !== quote[j]) continue outer;
    return { from: i, to: i + quote.length - 1, exact: true };
  }
  if (!allowNear) return null;
  let best: { from: number; to: number; score: number } | null = null;
  for (let len = Math.max(1, quote.length - 2); len <= quote.length + 2; len++) {
    for (let i = 0; i + len <= t.length; i++) {
      const score = lcs(t.slice(i, i + len), quote) / Math.max(quote.length, len);
      if (!best || score > best.score) best = { from: i, to: i + len - 1, score };
    }
  }
  return best && best.score >= 0.8 ? { from: best.from, to: best.to, exact: false } : null;
}

function toEvidence(turn: IndexedTurn, span: { from: number; to: number }, role: EvidenceRole, match: Evidence['match']): Evidence {
  const first = turn.tokenWord[span.from];
  const last = turn.tokenWord[span.to];
  const words = turn.words.slice(first, last + 1);
  return {
    turn: turn.id,
    speaker: turn.speaker,
    role,
    quote: words.map((w) => w.text).join(' '),
    start: words[0].start,
    end: words[words.length - 1].end,
    match,
  };
}

/**
 * A turn and its continuation: the same person goes on after a short interjection by someone else
 * ("…readable, writable—" "Oh, yeah" "…everything."). Recognition splits such a sentence in two; a quote may span both.
 */
function continuation(index: Index, id: string): IndexedTurn | null {
  const turns = [...index.values()];
  const at = turns.findIndex((t) => t.id === id);
  const first = turns[at];
  if (!first) return null;
  for (let k = at + 1; k < turns.length && k <= at + 3; k++) {
    const next = turns[k];
    if (next.speaker === first.speaker) {
      if (next.start - first.end > 3) return null;
      return {
        ...first,
        end: next.end,
        text: `${first.text} ${next.text}`,
        words: [...first.words, ...next.words],
        tokens: [...first.tokens, ...next.tokens],
        tokenWord: [...first.tokenWord, ...next.tokenWord.map((w) => w + first.words.length)],
      };
    }
    if (next.words.length > 3) return null;
  }
  return null;
}

function align(index: Index, turnId: string | null, quote: string, role: EvidenceRole): Evidence | null {
  const q = tokens(quote);
  const cited = turnId ? index.get(turnId) : undefined;
  if (cited) {
    const span = locate(cited, q, true);
    if (span) return toEvidence(cited, span, role, span.exact ? 'exact' : 'repaired');
    const joined = continuation(index, cited.id);
    const across = joined && locate(joined, q, true);
    if (joined && across) return toEvidence(joined, across, role, across.exact ? 'exact' : 'repaired');
  }
  for (const turn of index.values()) {
    if (turn.id === turnId) continue;
    const span = locate(turn, q, false);
    if (span) return toEvidence(turn, span, role, 'moved');
  }
  return null;
}

const SELF_INTRO_BEFORE = new Set(["i'm", 'am', 'is', "it's", 'called']);

function isSelfIntroduction(quote: string, name: string): boolean {
  const q = tokens(quote);
  const n = tokens(name)[0];
  const at = q.indexOf(n);
  if (at < 0) return false;
  return SELF_INTRO_BEFORE.has(q[at - 1] ?? '') || SELF_INTRO_BEFORE.has(q[at - 2] ?? '') || q[at + 1] === 'here';
}

const titleCase = (name: string) => name.trim().replace(/\b\w/g, (c) => c.toUpperCase());

export function verifySpeakers(llm: LlmOutput, voices: { id: string; words: number }[], turns: Turn[]): Speaker[] {
  const index = indexTurns(turns);
  const taken = new Set<string>();
  return voices.map((voice) => {
    const claim = llm.speakers.find((s) => s.label === voice.id);
    let name: string | null = null;
    let intro: Evidence | null = null;
    if (claim?.name && claim.intro_quote) {
      const evidence = align(index, claim.intro_turn, claim.intro_quote, 'commitment');
      const key = normalize(claim.name);
      if (evidence && evidence.speaker === voice.id && isSelfIntroduction(evidence.quote, claim.name) && !taken.has(key)) {
        name = titleCase(claim.name);
        intro = evidence;
        taken.add(key);
      }
    }
    return { id: voice.id, name, label: name ?? `Speaker ${voice.id.slice(1)}`, words: voice.words, intro };
  });
}

export function verifyRecordingDate(llm: LlmOutput, turns: Turn[]): { date: string; evidence: Evidence } | null {
  const { date, turn, quote } = llm.recording_date;
  if (!date || !quote) return null;
  const evidence = align(indexTurns(turns), turn, quote, 'commitment');
  const checked = evidence ? checkAnchor(date, evidence.quote) : null;
  return checked && evidence ? { date: checked, evidence } : null;
}

const slug = (s: string) => normalize(s).replace(/ /g, '-').slice(0, 48) || 'item';

type ItemContext = { index: Index; speakers: Speaker[]; anchor: string | null };

function verifyItem(raw: LlmItem, n: number, ctx: ItemContext): { item: Item } | { dropped: { title: string; reason: string } } {
  const evidence: Evidence[] = [];
  let missing = 0;
  for (const e of raw.evidence) {
    const found = align(ctx.index, e.turn, e.quote, e.role);
    if (!found) missing++;
    else if (!evidence.some((x) => x.turn === found.turn && x.start === found.start && x.end === found.end)) evidence.push(found);
  }
  evidence.sort((a, b) => a.start - b.start);
  if (!evidence.length) return { dropped: { title: raw.title, reason: 'None of its quotes were found in the transcript.' } };
  // A role is the model's claim; the words decide. "Yes, that definitely needs to happen" is not a hedge.
  for (const e of evidence) {
    const words = normalize(e.quote);
    if (e.role === 'hedge' && !HEDGE.test(words) && AFFIRMATIVE.test(words)) e.role = 'acceptance';
  }

  const checks: Check[] = [];
  checks.push({
    name: 'quotes',
    ok: missing === 0,
    note: missing ? `${missing} quote(s) not found in the transcript were removed.` : undefined,
  });

  // Status
  const has = (...roles: EvidenceRole[]) => evidence.some((e) => roles.includes(e.role));
  let status: Status = raw.status;
  let statusNote: string | undefined;
  if (status === 'agreed') {
    const deciding = evidence.filter((e) => e.role === 'commitment' || e.role === 'acceptance');
    const hedged = deciding.find((e) => HEDGE.test(normalize(e.quote)));
    if (!deciding.length) statusNote = 'No commitment or acceptance was found in the quotes.';
    else if (hedged) statusNote = `The commitment is hedged: “${hedged.quote}”.`;
  } else if (status === 'cancelled' && !has('cancellation')) {
    statusNote = 'No cancellation was found in the quotes.';
  } else if (status === 'open_question' && !has('question')) {
    statusNote = 'No question was found in the quotes.';
  } else if (status === 'not_accepted' && !has('proposal', 'request', 'rejection')) {
    statusNote = 'No proposal was found in the quotes.';
  } else if (status === 'not_accepted' && !has('rejection')) {
    // The model says nobody accepted it, but the other person answered with a plain "yes": ask, don't decide.
    const proposal = evidence.find((e) => e.role === 'proposal' || e.role === 'request');
    const yes = proposal && evidence.find((e) => e.speaker !== proposal.speaker && e.start >= proposal.end && AFFIRMATIVE.test(normalize(e.quote)));
    if (yes) statusNote = `Marked as not accepted, but the reply was “${yes.quote}”.`;
  }
  if (statusNote) status = 'needs_review';
  checks.push({ name: 'status', ok: !statusNote, note: statusNote });

  // Owner
  const nameOf = (id: string) => ctx.speakers.find((s) => s.id === id)?.label ?? id;
  const knownName = (id: string) => ctx.speakers.find((s) => s.id === id)?.name ?? null;
  let owner: Owner = { kind: 'none' };
  let ownerNote: string | undefined;
  if (status !== 'not_accepted' && status !== 'open_question') {
    if (raw.owner_name) {
      if (evidence.some((e) => containsPhrase(e.quote, raw.owner_name!))) owner = { kind: 'named', name: titleCase(raw.owner_name) };
      else ownerNote = `Owner “${raw.owner_name}” removed: that name is not in the quotes.`;
    } else if (raw.owner_speaker) {
      const id = raw.owner_speaker;
      const own = evidence.filter((e) => e.speaker === id);
      const committed = own.find((e) => (e.role === 'commitment' || e.role === 'acceptance') && COMMITMENT.test(normalize(e.quote)));
      const request = evidence.find((e) => {
        if (e.speaker === id || (e.role !== 'request' && e.role !== 'deadline_change')) return false;
        const name = knownName(id);
        return ADDRESSED.test(normalize(e.quote)) || (!!name && containsPhrase(e.quote, name));
      });
      const accepted = request && own.find((e) => e.role === 'acceptance' && e.start >= request.end);
      const tentative =
        status === 'needs_review' && own.find((e) => (e.role === 'hedge' || e.role === 'commitment') && FIRST_PERSON.test(normalize(e.quote)));
      if (committed) owner = { kind: 'speaker', speaker: id, name: nameOf(id), how: 'commitment' };
      else if (accepted) owner = { kind: 'speaker', speaker: id, name: nameOf(id), how: 'accepted_request' };
      else if (tentative) owner = { kind: 'speaker', speaker: id, name: nameOf(id), how: 'tentative' };
      else ownerNote = `Owner removed: the quotes show no commitment by ${nameOf(id)} and no request that ${nameOf(id)} accepted.`;
    }
  }
  checks.push({ name: 'owner', ok: !ownerNote, note: ownerNote });

  // Deadline
  let deadline: Deadline = { kind: 'none', raw: null, date: null, ambiguous: false, previous: [] };
  let deadlineNote: string | undefined;
  if (raw.deadline && status !== 'not_accepted' && status !== 'open_question') {
    // A quote can run on into the next turn after an interjection, so its own words count too.
    const quotedTurns = evidence.map((e) => `${ctx.index.get(e.turn)!.text} ${e.quote}`);
    const supported = (wording: string) => quotedTurns.some((text) => containsPhrase(text, wording));
    if (supported(raw.deadline)) {
      deadline = {
        ...resolveDeadline(raw.deadline, ctx.anchor),
        raw: raw.deadline.trim(),
        previous: raw.previous_deadlines.filter(supported).map((p) => p.trim()),
      };
    } else {
      deadlineNote = `Deadline “${raw.deadline}” removed: that wording is not in the quoted turns.`;
    }
  }
  checks.push({ name: 'deadline', ok: !deadlineNote, note: deadlineNote });

  return {
    item: {
      id: `${slug(raw.title)}-${n}`,
      title: raw.title.trim().slice(0, 120),
      status,
      owner,
      deadline,
      evidence,
      why: raw.why.trim(),
      checks,
    },
  };
}

const titleWords = (title: string) => new Set(title.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2));

/**
 * The model sometimes lists one item two or three times. A repeat has the same final state, rests on the
 * same turns, and has a similar title. One turn can hold two different tasks, so shared turns alone are not enough.
 */
function isRepeat(a: Item, b: Item) {
  if (a.status !== b.status) return false;
  const turnsA = new Set(a.evidence.map((e) => e.turn));
  const turnsB = new Set(b.evidence.map((e) => e.turn));
  const sharedTurns = [...turnsA].filter((t) => turnsB.has(t)).length;
  if (!sharedTurns || sharedTurns < Math.min(turnsA.size, turnsB.size)) return false;
  const wordsA = titleWords(a.title);
  const wordsB = titleWords(b.title);
  const sharedWords = [...wordsA].filter((w) => wordsB.has(w)).length;
  return sharedWords / (new Set([...wordsA, ...wordsB]).size || 1) >= 0.5;
}

/** Whether a reply leaves a question open ("No idea", "It depends", "Maybe") or answers it ("Yeah", "Nah, it's fine", an explanation). */
function leavesOpen(reply: string) {
  const words = normalize(reply);
  if (UNKNOWN.test(words)) return true;
  if (DIRECT_ANSWER.test(words)) return false;
  return HEDGE.test(words);
}

/**
 * An open question is one nobody answered. The model sometimes lists a question that was answered on the spot
 * ("Is the migration okay?" "Nah, it's fine."), and its labels can point at the reply to another question,
 * so the words of the first real reply decide.
 */
function answeredInCall(item: Item, turns: Turn[]) {
  const question = item.evidence.find((e) => e.role === 'question');
  if (!question) return false;
  const reply = turns.find(
    (t) => t.speaker !== question.speaker && t.start >= question.end - 0.2 && t.start <= question.end + 15 && !FILLER.test(normalize(t.text)),
  );
  return !!reply && !leavesOpen(reply.text);
}

/** Every quote lies inside the sentence that says when the call happened ("It's Monday, October 5th"). */
const onlyRestatesDate = (item: Item, date: Evidence | null) =>
  !!date && item.evidence.every((e) => e.turn === date.turn && e.start >= date.start - 0.05 && e.end <= date.end + 0.05);

export function verifyItems(llm: LlmOutput, turns: Turn[], speakers: Speaker[], anchor: string | null, dateEvidence: Evidence | null = null) {
  const ctx: ItemContext = { index: indexTurns(turns), speakers, anchor };
  const items: Item[] = [];
  const dropped: { title: string; reason: string }[] = [];
  llm.items.forEach((raw, i) => {
    const verdict = verifyItem(raw, i + 1, ctx);
    if (!('item' in verdict)) dropped.push(verdict.dropped);
    else if (onlyRestatesDate(verdict.item, dateEvidence)) dropped.push({ title: verdict.item.title, reason: 'It only says when the call happened.' });
    else if (verdict.item.status === 'open_question' && answeredInCall(verdict.item, turns)) dropped.push({ title: verdict.item.title, reason: 'It was answered in the call.' });
    else if (items.some((kept) => isRepeat(kept, verdict.item))) dropped.push({ title: verdict.item.title, reason: 'Listed twice by the model; kept once.' });
    else items.push(verdict.item);
  });
  items.sort((a, b) => a.evidence[0].start - b.evidence[0].start);
  return { items, dropped };
}

/** Re-resolves deadlines when the user confirms the recording date; no model call needed. */
export function applyAnchor(items: Item[], anchor: string | null): Item[] {
  return items.map((item) =>
    item.deadline.raw ? { ...item, deadline: { ...item.deadline, ...resolveDeadline(item.deadline.raw, anchor) } } : item,
  );
}
