import { clock } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '../ui/button';

export type Sample = { case: string; title: string; purpose: string; outcome: 'result' | 'clarify' | 'decline'; durationSec: number; url: string };

const OUTCOME: Record<Sample['outcome'], string> = {
  result: 'Expects a list',
  clarify: 'Expects a question',
  decline: 'Expects a refusal',
};

/** Decorative waveform; heights come from the case id so each card keeps its own shape. */
function MiniWave({ seed }: { seed: string }) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const bars = Array.from({ length: 36 }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    return { height: 20 + (h % 70), lime: (i + (h % 3)) % 5 < 2 };
  });
  return (
    <div aria-hidden className="flex h-16 min-w-0 flex-1 items-center gap-1">
      {bars.map((b, i) => (
        <span key={i} className={cn('max-w-1.5 min-w-0.5 flex-1', b.lime ? 'bg-accent' : 'bg-ink')} style={{ height: `${b.height}%` }} />
      ))}
    </div>
  );
}

/** Test recordings as numbered cards: a dark band with the waveform, a light caption with the details. */
export function SampleList({ samples, busyCase, onRun }: { samples: Sample[]; busyCase: string | null; onRun: (sample: Sample) => void }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {samples.map((sample, i) => {
        const lead = i === 0;
        return (
          <li key={sample.case} className="flex flex-col border-2 border-border-strong">
            <div className="surface-dark flex items-center justify-between gap-4 px-4 py-4">
              <MiniWave seed={sample.case} />
              <span className="tag-label shrink-0 text-muted">{clock(sample.durationSec)}</span>
            </div>
            <div className={cn('surface-light flex flex-1 flex-col gap-2 p-5', lead && 'bg-accent')}>
              <p className="tag-label text-text">
                {sample.case.split('-')[0]} · {OUTCOME[sample.outcome]}
              </p>
              <p className="font-display text-title-3 font-bold text-text">{sample.title}</p>
              <p className={cn('text-caption', lead ? 'text-text' : 'text-muted')}>{sample.purpose}</p>
              <div className="mt-auto pt-4">
                <Button
                  size="sm"
                  variant={lead ? 'ink' : 'secondary'}
                  icon="play"
                  loading={busyCase === sample.case}
                  disabled={busyCase !== null && busyCase !== sample.case}
                  onClick={() => onRun(sample)}
                >
                  Run live
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
