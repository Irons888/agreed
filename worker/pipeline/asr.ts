import type { Word } from '../types';

export const ASR_MODELS = {
  'scribe-v2': 'elevenlabs/scribe_v2',
  'nova-3': '@cf/deepgram/nova-3',
} as const;
export type AsrName = keyof typeof ASR_MODELS;

/** Scribe v2 when its key is set; Nova-3 on Workers AI otherwise, so the repo runs without an ElevenLabs account. */
export const defaultAsr = (env: Env): AsrName => (env.ELEVENLABS_API_KEY ? 'scribe-v2' : 'nova-3');

/** `attempts` counts every call, failed ones included; `billedCalls` are the calls of the recognition that produced the words. */
export type Transcription = { words: Word[]; asr: AsrName; attempts: number; billedCalls: number; fallback: boolean };

/**
 * Speech to text with a speaker on every word. Scribe v2 is the default because it tells voices apart
 * on short turns where Nova-3 hears one voice (see docs/DEVLOG.md). If Scribe fails, Nova-3 takes over
 * and the result records which recognition ran.
 */
export async function transcribe(env: Env, wav: Uint8Array, preferred: AsrName): Promise<Transcription> {
  let attempts = 0;
  if (preferred === 'scribe-v2' && env.ELEVENLABS_API_KEY) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      attempts++;
      try {
        return { words: await scribe(env.ELEVENLABS_API_KEY, wav), asr: 'scribe-v2', attempts, billedCalls: 1, fallback: false };
      } catch (err) {
        console.warn(`Scribe v2 attempt ${attempt} failed: ${err instanceof Error ? err.message : String(err)}`);
        // A rejected request (bad key, no credits) will not succeed on a second try.
        if (err instanceof ScribeError && err.status < 500 && err.status !== 429) break;
      }
    }
  }
  const nova3 = await nova(env.AI, wav);
  return {
    words: nova3.words,
    asr: 'nova-3',
    attempts: attempts + nova3.attempts,
    billedCalls: nova3.attempts,
    fallback: preferred !== 'nova-3',
  };
}

class ScribeError extends Error {
  constructor(readonly status: number, detail: string) {
    super(`Scribe ${status}: ${detail}`);
  }
}

type ScribeWord = { text: string; type: 'word' | 'spacing' | 'audio_event'; start?: number; end?: number; speaker_id?: string; logprob?: number };

async function scribe(apiKey: string, wav: Uint8Array): Promise<Word[]> {
  const form = new FormData();
  form.append('model_id', 'scribe_v2');
  form.append('language_code', 'en');
  form.append('diarize', 'true');
  form.append('timestamps_granularity', 'word');
  // Laughter and other sound tags are not speech and must never end up inside a quote.
  form.append('tag_audio_events', 'false');
  form.append('file', new Blob([wav], { type: 'audio/wav' }), 'audio.wav');
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new ScribeError(res.status, (await res.text()).slice(0, 200));
  const out = (await res.json()) as { words?: ScribeWord[] };
  return (out.words ?? [])
    .filter((w) => w.type === 'word' && w.start !== undefined)
    .map((w) => ({
      text: w.text,
      start: w.start!,
      end: w.end ?? w.start!,
      // "speaker_3" → 3
      speaker: Number(w.speaker_id?.replace(/\D/g, '') || 0),
      confidence: Math.exp(w.logprob ?? 0),
    }));
}

type NovaWord = { word: string; punctuated_word?: string; start: number; end: number; speaker?: number; confidence?: number };

/**
 * `smart_format` is off on purpose: it rewrites spoken dates ("October 5th, 2026" became "10/05/2026"),
 * and quotes must match what was said.
 */
async function nova(ai: Ai, wav: Uint8Array): Promise<{ words: Word[]; attempts: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const out = (await ai.run(ASR_MODELS['nova-3'] as never, {
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
