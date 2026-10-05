import type { Word } from '../types';

export const ASR_MODEL = '@cf/deepgram/nova-3';

type NovaWord = { word: string; punctuated_word?: string; start: number; end: number; speaker?: number; confidence?: number };

/**
 * Speech to text with a speaker on every word. `smart_format` is off on purpose:
 * it rewrites spoken dates ("October 5th, 2026" became "10/05/2026"), and quotes must match what was said.
 */
export async function transcribe(ai: Ai, wav: Uint8Array): Promise<{ words: Word[]; attempts: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const out = (await ai.run(ASR_MODEL as never, {
        audio: { body: new Blob([wav]).stream(), contentType: 'audio/wav' },
        diarize: true,
        punctuate: true,
        smart_format: false,
        language: 'en',
      } as never)) as { results?: { channels?: { alternatives?: { words?: NovaWord[] }[] }[] } };
      const words = out?.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
      return {
        words: words.map((w) => ({
          text: w.punctuated_word ?? w.word,
          start: w.start,
          end: w.end,
          speaker: w.speaker ?? 0,
          confidence: w.confidence ?? 1,
        })),
        attempts: attempt,
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
