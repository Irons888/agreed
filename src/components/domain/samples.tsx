import { clock } from '@/lib/format';
import { Button } from '../ui/button';

export type Sample = { case: string; title: string; purpose: string; outcome: 'result' | 'clarify' | 'decline'; durationSec: number; url: string };

const OUTCOME: Record<Sample['outcome'], string> = {
  result: 'should return a list',
  clarify: 'should ask before concluding',
  decline: 'should decline',
};

/** The whole test set, for reviewers: what each recording checks and what the product should do with it. */
export function SampleList({ samples, busyCase, onRun }: { samples: Sample[]; busyCase: string | null; onRun: (sample: Sample) => void }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {samples.map((sample) => (
        <li key={sample.case} className="flex flex-col gap-2 border-2 border-border-strong bg-surface p-5">
          <p className="text-caption text-muted">
            {sample.case.split('-')[0]} · {clock(sample.durationSec)} · {OUTCOME[sample.outcome]}
          </p>
          <p className="heading text-title-3 text-text">{sample.title}</p>
          <p className="text-caption text-muted">{sample.purpose}</p>
          <div className="mt-auto pt-3">
            <Button
              size="sm"
              icon="play"
              loading={busyCase === sample.case}
              disabled={busyCase !== null && busyCase !== sample.case}
              onClick={() => onRun(sample)}
            >
              Run live
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One or two example calls next to the upload, for people without a recording at hand. */
export function ExampleButtons({ samples, busyCase, onRun }: { samples: Sample[]; busyCase: string | null; onRun: (sample: Sample) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {samples.map((sample) => (
        <Button
          key={sample.case}
          size="sm"
          icon="play"
          loading={busyCase === sample.case}
          disabled={busyCase !== null && busyCase !== sample.case}
          onClick={() => onRun(sample)}
        >
          {sample.title.split(':')[0]} · {clock(sample.durationSec)}
        </Button>
      ))}
    </div>
  );
}
