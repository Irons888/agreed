import type { Turn, Word } from '../types';

const MAX_PAUSE_IN_TURN = 1.5;

/**
 * Builds speaker turns from word-level diarization. Deepgram's own utterances sometimes glue
 * two people together, while its per-word speakers are reliable, so turns are rebuilt here.
 * Tiny clusters (a few stray words) are treated as noise, not as an extra person.
 */
export function buildTurns(words: Word[]): { turns: Turn[]; voices: { id: string; words: number }[] } {
  const counts = new Map<number, number>();
  for (const w of words) counts.set(w.speaker, (counts.get(w.speaker) ?? 0) + 1);
  const isVoice = (speaker: number) => {
    const n = counts.get(speaker) ?? 0;
    return n >= 4 || n / Math.max(words.length, 1) >= 0.05;
  };

  const order: number[] = [];
  for (const w of words) if (isVoice(w.speaker) && !order.includes(w.speaker)) order.push(w.speaker);
  const label = new Map(order.map((speaker, i) => [speaker, `S${i + 1}`]));

  const turns: Turn[] = [];
  let current: Turn | null = null;
  for (const w of words) {
    // A stray word stays with the turn it falls into.
    const speaker: string = label.get(w.speaker) ?? current?.speaker ?? 'S1';
    if (!current || speaker !== current.speaker || w.start - current.end > MAX_PAUSE_IN_TURN) {
      current = { id: `u${turns.length + 1}`, speaker, start: w.start, end: w.end, text: '', words: [] };
      turns.push(current);
    }
    current.words.push({ text: w.text, start: w.start, end: w.end });
    current.end = w.end;
  }
  for (const turn of turns) turn.text = turn.words.map((w) => w.text).join(' ');

  return {
    turns,
    voices: order.map((speaker, i) => ({ id: `S${i + 1}`, words: counts.get(speaker) ?? 0 })),
  };
}
