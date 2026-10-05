import type { AsrName } from './asr';
import type { LlmModelName, LlmUsage } from './extract';

// List prices, checked 2026-10-05:
// ElevenLabs Scribe v2 (batch): $0.22 per audio hour, speaker separation included. https://elevenlabs.io/pricing/api
// Workers AI: https://developers.cloudflare.com/workers-ai/platform/pricing/
//   Nova-3 (HTTP): $0.0052 per audio minute = 472.73 neurons.
//   gpt-oss-120b: $0.35 / $0.75 and gpt-oss-20b: $0.20 / $0.30 per million input / output tokens.
// Free allowances are ignored on purpose: free credits are not zero operating cost.
export const PRICES = {
  checkedOn: '2026-10-05',
  usdPerNeuron: 0.011 / 1000,
  scribeUsdPerHour: 0.22,
  novaNeuronsPerMinute: 472.73,
  llm: {
    'gpt-oss-120b': { input: 0.35, output: 0.75 },
    'gpt-oss-20b': { input: 0.2, output: 0.3 },
  } satisfies Record<LlmModelName, { input: number; output: number }>,
};

const round = (usd: number) => Math.round(usd * 1e6) / 1e6;

export function costOf(audioMinutes: number, asr: AsrName, asrCalls: number, llm: LlmUsage, model: LlmModelName) {
  const asrNeurons = asr === 'nova-3' ? audioMinutes * PRICES.novaNeuronsPerMinute * asrCalls : 0;
  const asrUsd = asr === 'nova-3' ? asrNeurons * PRICES.usdPerNeuron : (audioMinutes / 60) * PRICES.scribeUsdPerHour * asrCalls;
  // Workers AI reports neurons per call; fall back to token prices if it doesn't.
  const llmUsd = llm.neurons
    ? llm.neurons * PRICES.usdPerNeuron
    : (llm.promptTokens * PRICES.llm[model].input + llm.completionTokens * PRICES.llm[model].output) / 1e6;
  const totalUsd = asrUsd + llmUsd;
  return {
    asrNeurons: Math.round(asrNeurons * 100) / 100,
    asrUsd: round(asrUsd),
    llmUsd: round(llmUsd),
    totalUsd: round(totalUsd),
    perAudioMinuteUsd: round(audioMinutes > 0 ? totalUsd / audioMinutes : 0),
    pricesCheckedOn: PRICES.checkedOn,
  };
}
