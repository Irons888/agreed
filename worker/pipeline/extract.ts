import { z } from 'zod';
import type { Turn } from '../types';
import { clock } from '../lib/text';
import { EXAMPLE_OUTPUT, EXAMPLE_TRANSCRIPT, ROLES, STATUSES, systemPrompt } from './prompt';

/** Models the extraction can run on. The default is the one the eval was tuned on. */
export const LLM_MODELS = {
  'gpt-oss-120b': '@cf/openai/gpt-oss-120b',
  'gpt-oss-20b': '@cf/openai/gpt-oss-20b',
} as const;
export type LlmModelName = keyof typeof LLM_MODELS;
export const DEFAULT_LLM: LlmModelName = 'gpt-oss-120b';
const MAX_ATTEMPTS = 2;

export const LlmOutput = z.object({
  speakers: z.array(
    z.object({
      label: z.string(),
      name: z.string().nullable(),
      intro_turn: z.string().nullable(),
      intro_quote: z.string().nullable(),
    }),
  ),
  recording_date: z.object({ date: z.string().nullable(), turn: z.string().nullable(), quote: z.string().nullable() }),
  items: z.array(
    z.object({
      title: z.string().min(1),
      status: z.enum(STATUSES),
      owner_speaker: z.string().nullable(),
      owner_name: z.string().nullable(),
      deadline: z.string().nullable(),
      previous_deadlines: z.array(z.string()),
      evidence: z.array(z.object({ turn: z.string(), role: z.enum(ROLES), quote: z.string() })),
      why: z.string(),
    }),
  ),
});
export type LlmOutput = z.infer<typeof LlmOutput>;
export type LlmItem = LlmOutput['items'][number];

const nullableString = { type: ['string', 'null'] };

// Hand-written to stay within what Workers AI JSON mode accepts.
const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['speakers', 'recording_date', 'items'],
  properties: {
    speakers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'name', 'intro_turn', 'intro_quote'],
        properties: { label: { type: 'string' }, name: nullableString, intro_turn: nullableString, intro_quote: nullableString },
      },
    },
    recording_date: {
      type: 'object',
      additionalProperties: false,
      required: ['date', 'turn', 'quote'],
      properties: { date: nullableString, turn: nullableString, quote: nullableString },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'status', 'owner_speaker', 'owner_name', 'deadline', 'previous_deadlines', 'evidence', 'why'],
        properties: {
          title: { type: 'string' },
          status: { type: 'string', enum: [...STATUSES] },
          owner_speaker: nullableString,
          owner_name: nullableString,
          deadline: nullableString,
          previous_deadlines: { type: 'array', items: { type: 'string' } },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['turn', 'role', 'quote'],
              properties: { turn: { type: 'string' }, role: { type: 'string', enum: [...ROLES] }, quote: { type: 'string' } },
            },
          },
          why: { type: 'string' },
        },
      },
    },
  },
};

export const transcriptForModel = (turns: Turn[]) =>
  turns.map((t) => `[${t.id} ${clock(t.start)} ${t.speaker}] ${t.text}`).join('\n');

export type LlmUsage = { calls: number; promptTokens: number; completionTokens: number; neurons: number };

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type ChatResponse = {
  choices?: { message?: { content?: unknown } }[];
  response?: unknown;
  usage?: { prompt_tokens?: number; completion_tokens?: number; neurons?: number };
};

/** One model call; if the output doesn't match the schema, one retry that quotes the error back. */
export async function extract(ai: Ai, turns: Turn[], reasoning: string, model: LlmModelName = DEFAULT_LLM) {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(reasoning) },
    { role: 'user', content: EXAMPLE_TRANSCRIPT },
    { role: 'assistant', content: JSON.stringify(EXAMPLE_OUTPUT) },
    { role: 'user', content: transcriptForModel(turns) },
  ];
  const usage: LlmUsage = { calls: 0, promptTokens: 0, completionTokens: 0, neurons: 0 };
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let raw = '';
    try {
      const out = (await ai.run(LLM_MODELS[model] as never, {
        messages,
        response_format: { type: 'json_schema', json_schema: { name: 'commitments', schema: RESPONSE_SCHEMA, strict: true } },
        max_tokens: 6000,
        temperature: 0,
        seed: 7,
      } as never)) as ChatResponse;
      usage.calls += 1;
      usage.promptTokens += out.usage?.prompt_tokens ?? 0;
      usage.completionTokens += out.usage?.completion_tokens ?? 0;
      usage.neurons += out.usage?.neurons ?? 0;
      const content = out.choices?.[0]?.message?.content ?? out.response;
      raw = typeof content === 'string' ? content : JSON.stringify(content);
      return { output: LlmOutput.parse(JSON.parse(raw)), usage, retries: attempt - 1 };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (raw) {
        messages.push(
          { role: 'assistant', content: raw.slice(0, 6000) },
          { role: 'user', content: `That output did not match the schema: ${lastError.slice(0, 600)}. Return the corrected JSON only.` },
        );
      }
    }
  }
  throw new Error(`Extraction failed after ${MAX_ATTEMPTS} attempts: ${lastError.slice(0, 300)}`);
}
