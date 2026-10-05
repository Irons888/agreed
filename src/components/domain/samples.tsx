import { clock } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '../ui/button';

export type Sample = { case: string; title: string; purpose: string; outcome: 'result' | 'clarify' | 'decline'; durationSec: number; url: string };

const OUTCOME: Record<Sample['outcome'], string> = {
  result: 'Expects a list',
  clarify: 'Expects a question',
  decline: 'Expects a refusal',
};

export function SampleList({ samples, busyCase, onRun }: { samples: Sample[]; busyCase: string | null; onRun: (sample: Sample) => void }) {
  return (
    <ul className="divide-y divide-border rounded-panel border border-border bg-surface">
      {samples.map((sample) => (
        <li key={sample.case} className="flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-2 text-label font-semibold text-text">
              <span className="w-6 shrink-0 font-mono text-subtle">{sample.case.split('-')[0]}</span>
              <span className="min-w-0">{sample.title}</span>
            </p>
            <p className="mt-0.5 line-clamp-2 pl-8 text-caption text-muted">{sample.purpose}</p>
            <p className="mt-1 pl-8 text-caption text-subtle">
              <span className="font-mono tabular">{clock(sample.durationSec)}</span> · {OUTCOME[sample.outcome]}
            </p>
          </div>
          <Button
            size="sm"
            icon="sample"
            loading={busyCase === sample.case}
            disabled={busyCase !== null && busyCase !== sample.case}
            onClick={() => onRun(sample)}
            className={cn('shrink-0')}
          >
            Run
          </Button>
        </li>
      ))}
    </ul>
  );
}
