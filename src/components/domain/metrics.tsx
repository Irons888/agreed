import type { Metrics } from '../../../worker/types';
import { seconds, usd } from '@/lib/format';
import { Icon, type IconName } from '../ui/icon';

export function MetricTile({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="flex items-center gap-1.5 text-caption text-muted">
        <Icon name={icon} size={14} />
        {label}
      </p>
      <p className="mt-1 font-mono text-title-2 font-semibold text-text tabular">{value}</p>
      {sub && <p className="mt-0.5 text-caption text-subtle">{sub}</p>}
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
        <tbody className="divide-y divide-border">
          {rows.map(([label, detail, value]) => (
            <tr key={label}>
              <th scope="row" className="py-2 pr-3 font-medium text-text">
                {label}
              </th>
              <td className="py-2 pr-3 text-muted">{detail}</td>
              <td className="py-2 text-right font-mono text-text tabular">{value}</td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="py-2 pr-3 font-semibold text-text">
              Total
            </th>
            <td className="py-2 pr-3 text-muted">{usd(cost.perAudioMinuteUsd)} per audio minute</td>
            <td className="py-2 text-right font-mono font-semibold text-text tabular">{usd(cost.totalUsd)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-caption text-subtle">
        Workers AI list prices checked {cost.pricesCheckedOn}; the free daily allowance is ignored. Hosting is separate (Workers Paid, $5 a month).
        Server time {seconds(timings.totalMs)}: recognition {seconds(timings.asrMs)}, reasoning {seconds(timings.extractMs)}, checks {seconds(timings.verifyMs)}.
      </p>
    </div>
  );
}
