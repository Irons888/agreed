import { useEffect, useState, type ReactNode } from 'react';
import { Rules } from '@/components/domain/landing';
import { Page } from '@/components/domain/layout';
import { MetricTile } from '@/components/domain/metrics';
import { SampleList } from '@/components/domain/samples';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { PreparedAudio } from '@/lib/audio/prepare';
import { seconds, usd } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useSamples, useStart } from './use-start';

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

function Section({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="heading text-title-2 text-text">{title}</h2>
      {text && <p className="mt-1 max-w-3xl text-body text-muted">{text}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** For reviewers: the measured numbers, the whole test set to run live, and the rules each run is scored against. */
export function QualityPage({ onStart }: { onStart: (audio: PreparedAudio, prepareMs: number) => void }) {
  const [report, setReport] = useState<Report | null | undefined>(undefined);
  const samples = useSamples();
  const { busy, error, startSample } = useStart(onStart);
  useEffect(() => {
    fetch('/quality/latest.json')
      .then((r) => (r.ok ? r.json() : null))
      .then(setReport)
      .catch(() => setReport(null));
  }, []);

  const s = report?.summary;

  return (
    <Page className="space-y-14">
      <header className="max-w-3xl">
        <h1 className="heading text-title-1 text-text">Quality report</h1>
        <p className="mt-3 text-body-lg text-muted">
          Every test recording is uploaded to the live pipeline and scored against an expected list written before the product existed. A run passes
          only if every real commitment is found with the right status, owner and deadline, and nothing unsupported is added.
        </p>
        {report && (
          <p className="mt-2 text-caption text-subtle">
            Last run {new Date(report.startedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · {report.runs} run
            {report.runs === 1 ? '' : 's'} per recording · reasoning {report.reasoning}
          </p>
        )}
      </header>

      {report === undefined && <Skeleton className="h-64" />}
      {report === null && <p className="text-body text-muted">No evaluation has been run yet.</p>}

      {s && (
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
      )}

      <Section title="Test recordings" text="Six short calls made for this test. Each one runs live on the same pipeline as an upload; nothing is cached.">
        {samples === undefined ? (
          <Skeleton className="h-48" />
        ) : samples.length ? (
          <SampleList samples={samples} busyCase={busy} onRun={startSample} />
        ) : (
          <p className="text-body text-muted">Test recordings are not available.</p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-body text-danger">
            {error}
          </p>
        )}
      </Section>

      {report && (
        <Section title="By recording">
          <div className="overflow-x-auto border-2 border-border-strong bg-surface">
            <table className="w-full min-w-xl text-left text-body">
              <thead className="border-b-2 border-border-strong">
                <tr className="text-caption text-muted">
                  <th className="px-4 py-3 font-medium">Recording</th>
                  <th className="px-4 py-3 font-medium">Expected</th>
                  <th className="px-4 py-3 font-medium">Runs passed</th>
                  <th className="px-4 py-3 font-medium">Found</th>
                  <th className="px-4 py-3 font-medium">Unsupported</th>
                  <th className="px-4 py-3 text-right font-medium">Median time</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-border">
                {report.cases.map((c) => {
                  const passed = c.runs.filter((r) => r.pass).length;
                  const time = median(c.runs.map((r) => r.clientMs ?? 0).filter(Boolean));
                  return (
                    <tr key={c.case}>
                      <td className="px-4 py-3 font-semibold text-text">{c.case}</td>
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
        </Section>
      )}

      <Section title="What counts" text="The brief's rules. A run that breaks any of them fails.">
        <Rules />
      </Section>

      {report && (
        <Section title="Failed checks">
          {report.cases.some((c) => c.runs.some((r) => r.failed.length || r.error)) ? (
            <ul className="divide-y-2 divide-border border-2 border-border-strong bg-surface">
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
            <p className="border-2 border-dashed border-border-strong px-4 py-5 text-body text-muted">None in the last evaluation.</p>
          )}
        </Section>
      )}
    </Page>
  );
}
