export type Status = 'agreed' | 'open_question' | 'needs_review' | 'not_accepted' | 'cancelled';

export type EvidenceRole =
  | 'proposal'
  | 'request'
  | 'commitment'
  | 'acceptance'
  | 'rejection'
  | 'hedge'
  | 'deadline_change'
  | 'cancellation'
  | 'question'
  | 'no_answer';

/** A word as returned by speech recognition. `speaker` is the raw diarization index. */
export type Word = { text: string; start: number; end: number; speaker: number; confidence: number };

export type TurnWord = { text: string; start: number; end: number };

/** Consecutive words of one voice. `speaker` is our label: S1, S2, … in order of first appearance. */
export type Turn = { id: string; speaker: string; start: number; end: number; text: string; words: TurnWord[] };

export type Evidence = {
  turn: string;
  speaker: string;
  role: EvidenceRole;
  /** Word for word from the transcript, never the model's paraphrase. */
  quote: string;
  start: number;
  end: number;
  /** exact: found as cited; repaired: near-identical wording in the cited turn; moved: found in another turn. */
  match: 'exact' | 'repaired' | 'moved';
};

export type Owner =
  | { kind: 'speaker'; speaker: string; name: string; how: 'commitment' | 'accepted_request' | 'tentative' }
  | { kind: 'named'; name: string }
  | { kind: 'none' };

export type Deadline = {
  kind: 'none' | 'date' | 'relative' | 'vague';
  /** Wording exactly as spoken. */
  raw: string | null;
  /** ISO date, only when the recording date is known. */
  date: string | null;
  ambiguous: boolean;
  previous: string[];
};

export type Check = { name: 'quotes' | 'status' | 'owner' | 'deadline'; ok: boolean; note?: string };

export type Item = {
  id: string;
  title: string;
  status: Status;
  owner: Owner;
  deadline: Deadline;
  evidence: Evidence[];
  why: string;
  checks: Check[];
};

export type Speaker = { id: string; name: string | null; label: string; words: number; intro: Evidence | null };

export type Clarification =
  | { kind: 'speaker_names'; blocking: true; speakers: string[] }
  | { kind: 'recording_date'; blocking: false }
  | { kind: 'review_items'; blocking: false; items: string[] };

export type DeclineReason = 'not_wav' | 'too_long' | 'too_short' | 'no_speech' | 'one_voice' | 'too_many_voices';

export type Metrics = {
  /** `asrFallback`: the preferred recognition failed and Nova-3 produced the transcript. */
  models: { asr: string; asrFallback?: boolean; llm: string; reasoning: string };
  timings: { asrMs: number; extractMs: number; verifyMs: number; totalMs: number };
  usage: {
    audioMinutes: number;
    asrAttempts: number;
    asrNeurons: number;
    llmCalls: number;
    llmPromptTokens: number;
    llmCompletionTokens: number;
    llmNeurons: number;
    retries: number;
  };
  cost: { asrUsd: number; llmUsd: number; totalUsd: number; perAudioMinuteUsd: number; pricesCheckedOn: string };
};

export type Result = {
  version: 1;
  id: string;
  createdAt: string;
  fileName: string | null;
  durationSec: number;
  outcome: 'result' | 'clarify' | 'decline';
  decline: { reason: DeclineReason; message: string } | null;
  speakers: Speaker[];
  recordingDate: { date: string; source: 'recording' | 'user'; evidence: Evidence | null } | null;
  turns: Turn[];
  items: Item[];
  dropped: { title: string; reason: string }[];
  clarifications: Clarification[];
  metrics: Metrics;
};

export type RunEvent =
  | { type: 'accepted'; id: string; durationSec: number }
  | { type: 'stage'; stage: 'transcribe' | 'extract' | 'verify'; status: 'start' | 'done'; ms?: number }
  | { type: 'transcript'; speakers: Speaker[]; turns: Turn[] }
  | { type: 'result'; result: Result }
  | { type: 'error'; message: string }
  /** Sent every few seconds so idle connections are not dropped while the model thinks. */
  | { type: 'tick' };
