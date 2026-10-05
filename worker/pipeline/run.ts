import type { Clarification, DeclineReason, Metrics, Result, RunEvent, Speaker, Turn } from '../types';
import { readWav } from '../lib/wav';
import { ASR_MODEL, transcribe } from './asr';
import { buildTurns } from './turns';
import { LLM_MODELS, extract, type LlmModelName, type LlmUsage } from './extract';
import { verifyItems, verifyRecordingDate, verifySpeakers } from './verify';
import { costOf } from './cost';

export const MAX_SECONDS = 180;

export type RunInput = { id: string; wav: Uint8Array; fileName: string | null; reasoning: string; model: LlmModelName };

const DECLINE_MESSAGES: Record<DeclineReason, string> = {
  not_wav: 'The upload is not a readable WAV recording.',
  too_long: 'The recording is longer than 3 minutes, the limit of this prototype.',
  too_short: 'The recording is too short to contain a discussion.',
  no_speech: 'No speech was detected in the recording.',
  one_voice:
    'Only one voice was detected. Telling two people apart needs about 30 seconds of back-and-forth, and this prototype is built for two-person conversations.',
  too_many_voices: 'More than two voices were detected. This prototype supports conversations between two people.',
};

export async function runPipeline(env: Env, input: RunInput, emit: (event: RunEvent) => void): Promise<Result> {
  const started = Date.now();
  const llmUsage: LlmUsage = { calls: 0, promptTokens: 0, completionTokens: 0, neurons: 0 };
  const timings = { asrMs: 0, extractMs: 0, verifyMs: 0, totalMs: 0 };
  let asrAttempts = 0;
  let retries = 0;
  let audioMinutes = 0;

  const metrics = (): Metrics => {
    const cost = costOf(audioMinutes, asrAttempts, llmUsage, input.model);
    return {
      models: { asr: ASR_MODEL, llm: LLM_MODELS[input.model], reasoning: input.reasoning },
      timings: { ...timings, totalMs: Date.now() - started },
      usage: {
        audioMinutes: Math.round(audioMinutes * 1000) / 1000,
        asrAttempts,
        asrNeurons: cost.asrNeurons,
        llmCalls: llmUsage.calls,
        llmPromptTokens: llmUsage.promptTokens,
        llmCompletionTokens: llmUsage.completionTokens,
        llmNeurons: Math.round(llmUsage.neurons * 100) / 100,
        retries,
      },
      cost: {
        asrUsd: cost.asrUsd,
        llmUsd: cost.llmUsd,
        totalUsd: cost.totalUsd,
        perAudioMinuteUsd: cost.perAudioMinuteUsd,
        pricesCheckedOn: cost.pricesCheckedOn,
      },
    };
  };

  const base = (durationSec: number) => ({
    version: 1 as const,
    id: input.id,
    createdAt: new Date().toISOString(),
    fileName: input.fileName,
    durationSec: Math.round(durationSec * 100) / 100,
  });

  const decline = (reason: DeclineReason, durationSec: number, speakers: Speaker[] = [], turns: Turn[] = []): Result => ({
    ...base(durationSec),
    outcome: 'decline',
    decline: { reason, message: DECLINE_MESSAGES[reason] },
    speakers,
    recordingDate: null,
    turns,
    items: [],
    dropped: [],
    clarifications: [],
    metrics: metrics(),
  });

  const wav = readWav(input.wav);
  if (!wav) return decline('not_wav', 0);
  if (wav.duration > MAX_SECONDS + 1) return decline('too_long', wav.duration);
  if (wav.duration < 3) return decline('too_short', wav.duration);
  audioMinutes = wav.duration / 60;
  emit({ type: 'accepted', id: input.id, durationSec: Math.round(wav.duration * 100) / 100 });

  // 1. Speech to text with a speaker on every word
  emit({ type: 'stage', stage: 'transcribe', status: 'start' });
  let t = Date.now();
  const asr = await transcribe(env.AI, input.wav);
  asrAttempts = asr.attempts;
  retries += asr.attempts - 1;
  timings.asrMs = Date.now() - t;
  emit({ type: 'stage', stage: 'transcribe', status: 'done', ms: timings.asrMs });

  const { turns, voices } = buildTurns(asr.words);
  const unnamed = voices.map((v) => ({ id: v.id, name: null, label: `Speaker ${v.id.slice(1)}`, words: v.words, intro: null }));
  emit({ type: 'transcript', speakers: unnamed, turns });
  if (!turns.length) return decline('no_speech', wav.duration);
  if (voices.length === 1) return decline('one_voice', wav.duration, unnamed, turns);
  if (voices.length > 2) return decline('too_many_voices', wav.duration, unnamed, turns);

  // 2. The model proposes items with quotes
  emit({ type: 'stage', stage: 'extract', status: 'start' });
  t = Date.now();
  const extraction = await extract(env.AI, turns, input.reasoning, input.model);
  Object.assign(llmUsage, extraction.usage);
  retries += extraction.retries;
  timings.extractMs = Date.now() - t;
  emit({ type: 'stage', stage: 'extract', status: 'done', ms: timings.extractMs });

  // 3. Code checks every claim against the transcript
  emit({ type: 'stage', stage: 'verify', status: 'start' });
  t = Date.now();
  const speakers = verifySpeakers(extraction.output, voices, turns);
  const recording = verifyRecordingDate(extraction.output, turns);
  const { items, dropped } = verifyItems(extraction.output, turns, speakers, recording?.date ?? null);
  timings.verifyMs = Date.now() - t;
  emit({ type: 'stage', stage: 'verify', status: 'done', ms: timings.verifyMs });

  const clarifications: Clarification[] = [];
  const nameless = speakers.filter((s) => !s.name).map((s) => s.id);
  if (nameless.length) clarifications.push({ kind: 'speaker_names', blocking: true, speakers: nameless });
  const active = items.filter((i) => i.status === 'agreed' || i.status === 'needs_review');
  if (!recording && active.some((i) => i.deadline.kind === 'relative')) clarifications.push({ kind: 'recording_date', blocking: false });
  const review = items.filter((i) => i.status === 'needs_review').map((i) => i.id);
  if (review.length) clarifications.push({ kind: 'review_items', blocking: false, items: review });

  return {
    ...base(wav.duration),
    outcome: clarifications.some((c) => c.blocking) ? 'clarify' : 'result',
    decline: null,
    speakers,
    recordingDate: recording ? { date: recording.date, source: 'recording', evidence: recording.evidence } : null,
    turns,
    items,
    dropped,
    clarifications,
    metrics: metrics(),
  };
}
