import type { LlmUsage } from './extract';

// List prices on Workers AI, checked 2026-10-05:
// https://developers.cloudflare.com/workers-ai/platform/pricing/
// Nova-3 (HTTP): $0.0052 per audio minute = 472.73 neurons. gpt-oss-120b: $0.35 / $0.75 per million input / output tokens.
// The free daily allocation is ignored on purpose: free credits are not zero operating cost.
export const PRICES = {
  checkedOn: '2026-10-05',
  usdPerNeuron: 0.011 / 1000,
  asrNeuronsPerMinute: 472.73,
  llmInputUsdPerMillion: 0.35,
  llmOutputUsdPerMillion: 0.75,
};

const round = (usd: number) => Math.round(usd * 1e6) / 1e6;

export function costOf(audioMinutes: number, asrAttempts: number, llm: LlmUsage) {
  const asrNeurons = audioMinutes * PRICES.asrNeuronsPerMinute * asrAttempts;
  const asrUsd = asrNeurons * PRICES.usdPerNeuron;
  // Workers AI reports neurons per call; fall back to token prices if it doesn't.
  const llmUsd = llm.neurons
    ? llm.neurons * PRICES.usdPerNeuron
    : (llm.promptTokens * PRICES.llmInputUsdPerMillion + llm.completionTokens * PRICES.llmOutputUsdPerMillion) / 1e6;
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
