import { useEffect, useState } from 'react';
import { Page } from '@/components/domain/layout';
import { MetricTile } from '@/components/domain/metrics';
import { Badge } from '@/components/ui/badge';
import { seconds, usd } from '@/lib/format';
import { cn } from '@/lib/cn';

type Check = { item: string; check: string; ok: boolean; detail: string };
type Run = { run: number; pass: boolean; error: string | null; included: string; exclusionErrors: number | null; failed: Check[]; clientMs: number | null };
type Report = {
  startedAt: string;
  runs: number;
  reasoning: string;
  cases: { case: string; outcome: string; runs: Run[] }[];
  summary: {
    runs: number;
    passed: number;
    errors: number;
    inclusion: string;
    exclusionErrors: number;
    timeToResultMs: { p50: number | null; p90: number | null };
    timeToTranscriptMs: { p50: number | null };
    retries: number;
    costPerRunUsd: number | null;
    costPerAudioMinuteUsd: number | null;
  };
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null;
};

export function QualityPage() {
  const [report, setReport] = useState<Report | null | undefined>(undefined);
  useEffect(() => {
    fetch('/quality/latest.json')
      .then((r) => (r.ok ? r.json() : null))
      .then(setReport)
      .catch(() => setReport(null));
  }, []);

  if (report === undefined) return <Page>Loading…</Page>;
  if (!report) return <Page>No evaluation has been run yet.</Page>;
  const s = report.summary;

  return (
    <Page className="space-y-10">
      <header>
        <h1 className="text-title-1 font-semibold text-text">Quality</h1>
        <p className="mt-2 max-w-3xl text-body-lg text-muted">
          Every test recording is uploaded to the live pipeline and the result is scored against an expected list written before the product existed.
          A run passes only if every real commitment is found with the right status, owner and deadline, and nothing unsupported is added.
        </p>
        <p className="mt-2 text-caption text-subtle">
          Last run {new Date(report.startedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · {report.runs} run
          {report.runs === 1 ? '' : 's'} per recording · reasoning “{report.reasoning}”
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile icon="checks" label="Runs passed" value={`${s.passed}/${s.runs}`} sub={s.errors ? `${s.errors} failed to run` : 'no failed requests'} />
        <MetricTile icon="agreed" label="Real items found" value={s.inclusion} sub="with the right final status" />
        <MetricTile icon="review" label="Unsupported items" value={String(s.exclusionErrors)} sub="extras, upgraded statuses, guessed owners or dates" />
        <MetricTile
          icon="time"
          label="Time to result"
          value={s.timeToResultMs.p50 != null ? seconds(s.timeToResultMs.p50) : '—'}
          sub={`p50 · p90 ${s.timeToResultMs.p90 != null ? seconds(s.timeToResultMs.p90) : '—'} · transcript after ${s.timeToTranscriptMs.p50 != null ? seconds(s.timeToTranscriptMs.p50) : '—'}`}
        />
        <MetricTile
          icon="cost"
          label="Cost per audio minute"
          value={s.costPerAudioMinuteUsd != null ? usd(s.costPerAudioMinuteUsd) : '—'}
          sub={`${s.costPerRunUsd != null ? usd(s.costPerRunUsd) : '—'} per run · list prices`}
        />
        <MetricTile icon="back" label="Retries" value={String(s.retries)} sub="model or recognition calls repeated" />
      </section>

      <section>
        <h2 className="text-title-2 font-semibold text-text">By recording</h2>
        <div className="mt-3 overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full min-w-xl text-left text-body">
            <thead className="border-b border-border text-caption text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Recording</th>
                <th className="px-4 py-2 font-medium">Expected</th>
                <th className="px-4 py-2 font-medium">Runs passed</th>
                <th className="px-4 py-2 font-medium">Found</th>
                <th className="px-4 py-2 font-medium">Unsupported</th>
                <th className="px-4 py-2 text-right font-medium">Median time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.cases.map((c) => {
                const passed = c.runs.filter((r) => r.pass).length;
                const time = median(c.runs.map((r) => r.clientMs ?? 0).filter(Boolean));
                return (
                  <tr key={c.case}>
                    <td className="px-4 py-2.5 font-medium text-text">{c.case}</td>
                    <td className="px-4 py-2.5 text-muted">{c.outcome}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <span className="flex gap-0.5" aria-hidden>
                          {c.runs.map((r) => (
                            <span key={r.run} className={cn('size-2.5 rounded-full', r.pass ? 'bg-agreed' : 'bg-review')} />
                          ))}
                        </span>
                        <span className="font-mono tabular">
                          {passed}/{c.runs.length}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular">{c.runs.at(-1)?.included}</td>
                    <td className="px-4 py-2.5 font-mono tabular">{c.runs.reduce((n, r) => n + (r.exclusionErrors ?? 0), 0)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular">{time ? seconds(time) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-title-2 font-semibold text-text">Failed checks</h2>
        {report.cases.some((c) => c.runs.some((r) => r.failed.length || r.error)) ? (
          <ul className="mt-3 space-y-2">
            {report.cases.flatMap((c) =>
              c.runs.flatMap((r) => [
                ...(r.error ? [<li key={`${c.case}-${r.run}-error`} className="text-body text-danger">{`${c.case} run ${r.run}: ${r.error}`}</li>] : []),
                ...r.failed.map((f, i) => (
                  <li key={`${c.case}-${r.run}-${i}`} className="flex flex-wrap items-center gap-2 text-body text-text">
                    <Badge size="sm">{`${c.case} · run ${r.run}`}</Badge>
                    {f.item} — {f.check}: <span className="text-muted">{f.detail}</span>
                  </li>
                )),
              ]),
            )}
          </ul>
        ) : (
          <p className="mt-2 text-body text-muted">None in the last evaluation.</p>
        )}
      </section>
    </Page>
  );
}
