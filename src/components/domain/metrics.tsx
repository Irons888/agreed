import type { Metrics } from '../../../worker/types';
import { seconds, usd } from '@/lib/format';
import { cn } from '@/lib/cn';

/** A big number with a monospace label, like a price tag. */
export function MetricTile({ label, value, sub, lead = false }: { label: string; value: string; sub?: string; lead?: boolean }) {
  return (
    <div className={cn('p-5', lead ? 'bg-accent text-on-accent' : 'bg-surface text-text')}>
      <p className="tag-label">{label}</p>
      <p className="numeral mt-8 text-title-1">{value}</p>
      {sub && <p className={cn('mt-2 text-caption', lead ? 'text-on-accent' : 'text-muted')}>{sub}</p>}
    </div>
  );
}

/** Variable cost of one run at list prices, by the categories the brief asks for. */
export function CostBreakdown({ metrics }: { metrics: Metrics }) {
  const { usage, cost, timings, models } = metrics;
  const rows: [string, string, string][] = [
    ['Recognition', `${models.asr} · ${usage.audioMinutes.toFixed(2)} min${usage.asrAttempts > 1 ? ` × ${usage.asrAttempts} attempts` : ''}`, usd(cost.asrUsd)],
    [
      'Reasoning',
      `${models.llm} · ${usage.llmPromptTokens.toLocaleString('en-US')} in / ${usage.llmCompletionTokens.toLocaleString('en-US')} out tokens · ${usage.llmCalls} call${usage.llmCalls === 1 ? '' : 's'}`,
      usd(cost.llmUsd),
    ],
    ['Retries', usage.retries ? `${usage.retries} (included above)` : 'none', '—'],
    ['Speech synthesis', 'not used', '—'],
    ['Paid intermediaries', 'none: Workers AI is called directly', '—'],
  ];
  return (
    <div>
      <table className="w-full text-left text-caption">
        <tbody>
          {rows.map(([label, detail, value]) => (
            <tr key={label} className="border-b-2 border-border">
              <th scope="row" className="py-3 pr-4 align-top font-normal">
                <span className="tag-label block text-text">{label}</span>
                <span className="mt-1 block text-muted">{detail}</span>
              </th>
              <td className="py-3 text-right align-top font-mono text-text tabular">{value}</td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="py-3 pr-4 align-top font-normal">
              <span className="tag-label block text-text">Total</span>
              <span className="mt-1 block text-muted">{usd(cost.perAudioMinuteUsd)} per audio minute</span>
            </th>
            <td className="numeral py-3 text-right align-top text-title-3">{usd(cost.totalUsd)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4 text-caption text-subtle">
        Workers AI list prices checked {cost.pricesCheckedOn}; the free daily allowance is ignored. Hosting is separate (Workers Paid, $5 a month).
        Server time {seconds(timings.totalMs)}: recognition {seconds(timings.asrMs)}, reasoning {seconds(timings.extractMs)}, checks {seconds(timings.verifyMs)}.
      </p>
    </div>
  );
}
