import { useEffect, useState } from 'react';
import { Page } from '@/components/domain/layout';
import { MetricTile } from '@/components/domain/metrics';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

function Heading({ children }: { children: string }) {
  return <h2 className="headline border-b-2 border-border-strong pb-3 text-title-2">{children}</h2>;
}

export function QualityPage() {
  const [report, setReport] = useState<Report | null | undefined>(undefined);
  useEffect(() => {
    fetch('/quality/latest.json')
      .then((r) => (r.ok ? r.json() : null))
      .then(setReport)
      .catch(() => setReport(null));
  }, []);

  if (report === undefined) {
    return (
      <Page>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-16 w-2/3" />
        <Skeleton className="mt-10 h-64" />
      </Page>
    );
  }
  if (!report) {
    return (
      <Page>
        <h1 className="headline text-title-1">Quality report</h1>
        <p className="mt-3 text-body-lg text-muted">No evaluation has been run yet.</p>
      </Page>
    );
  }
  const s = report.summary;

  return (
    <Page className="space-y-14">
      <header className="grid gap-6 lg:grid-cols-2 lg:items-end">
        <div>
          <p className="tag-label text-subtle">
            Last run {new Date(report.startedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · {report.runs} run
            {report.runs === 1 ? '' : 's'} per recording · reasoning {report.reasoning}
          </p>
          <h1 className="headline mt-3 text-display-sm sm:text-display">Quality report</h1>
        </div>
        <p className="max-w-xl text-body-lg text-muted">
          Every test recording is uploaded to the live pipeline and scored against an expected list written before the product existed. A run passes
          only if every real commitment is found with the right status, owner and deadline, and nothing unsupported is added.
        </p>
      </header>

      <section aria-label="Summary" className="grid gap-0.5 border-2 border-border-strong bg-border-strong sm:grid-cols-2 lg:grid-cols-3">
        <MetricTile lead label="Runs passed" value={`${s.passed}/${s.runs}`} sub={s.errors ? `${s.errors} failed to run` : 'no failed requests'} />
        <MetricTile label="Real items found" value={s.inclusion} sub="with the right final status" />
        <MetricTile label="Unsupported items" value={String(s.exclusionErrors)} sub="extras, upgraded statuses, guessed owners or dates" />
        <MetricTile
          label="Time to result"
          value={s.timeToResultMs.p50 != null ? seconds(s.timeToResultMs.p50) : '—'}
          sub={`median · p90 ${s.timeToResultMs.p90 != null ? seconds(s.timeToResultMs.p90) : '—'} · transcript after ${s.timeToTranscriptMs.p50 != null ? seconds(s.timeToTranscriptMs.p50) : '—'}`}
        />
        <MetricTile
          label="Cost per audio minute"
          value={s.costPerAudioMinuteUsd != null ? usd(s.costPerAudioMinuteUsd) : '—'}
          sub={`${s.costPerRunUsd != null ? usd(s.costPerRunUsd) : '—'} per run · list prices`}
        />
        <MetricTile label="Retries" value={String(s.retries)} sub="model or recognition calls repeated" />
      </section>

      <section>
        <Heading>By recording</Heading>
        <div className="mt-6 overflow-x-auto border-2 border-border-strong bg-surface">
          <table className="w-full min-w-xl text-left text-body">
            <thead className="border-b-2 border-border-strong">
              <tr className="tag-label text-muted">
                <th className="px-4 py-3 font-normal">Recording</th>
                <th className="px-4 py-3 font-normal">Expected</th>
                <th className="px-4 py-3 font-normal">Runs passed</th>
                <th className="px-4 py-3 font-normal">Found</th>
                <th className="px-4 py-3 font-normal">Unsupported</th>
                <th className="px-4 py-3 text-right font-normal">Median time</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-border">
              {report.cases.map((c) => {
                const passed = c.runs.filter((r) => r.pass).length;
                const time = median(c.runs.map((r) => r.clientMs ?? 0).filter(Boolean));
                return (
                  <tr key={c.case}>
                    <td className="headline px-4 py-3 text-title-3">{c.case}</td>
                    <td className="px-4 py-3 text-muted">{c.outcome}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-3">
                        <span className="flex gap-1" aria-hidden>
                          {c.runs.map((r) => (
                            <span key={r.run} className={cn('size-3 border border-border-strong', r.pass ? 'bg-agreed-bg' : 'bg-review-bg')} />
                          ))}
                        </span>
                        <span className="font-mono tabular">
                          {passed}/{c.runs.length}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular">{c.runs.at(-1)?.included}</td>
                    <td className="px-4 py-3 font-mono tabular">{c.runs.reduce((n, r) => n + (r.exclusionErrors ?? 0), 0)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular">{time ? seconds(time) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <Heading>Failed checks</Heading>
        {report.cases.some((c) => c.runs.some((r) => r.failed.length || r.error)) ? (
          <ul className="mt-6 divide-y-2 divide-border border-2 border-border-strong bg-surface">
            {report.cases.flatMap((c) =>
              c.runs.flatMap((r) => [
                ...(r.error ? [<li key={`${c.case}-${r.run}-error`} className="px-4 py-3 text-body text-danger">{`${c.case} run ${r.run}: ${r.error}`}</li>] : []),
                ...r.failed.map((f, i) => (
                  <li key={`${c.case}-${r.run}-${i}`} className="flex flex-wrap items-center gap-2 px-4 py-3 text-body text-text">
                    <Badge size="sm">{`${c.case} · run ${r.run}`}</Badge>
                    {f.item} — {f.check}: <span className="text-muted">{f.detail}</span>
                  </li>
                )),
              ]),
            )}
          </ul>
        ) : (
          <p className="mt-6 border-2 border-dashed border-border-strong px-4 py-5 text-body text-muted">None in the last evaluation.</p>
        )}
      </section>
    </Page>
  );
}
