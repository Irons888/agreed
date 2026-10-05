import { useEffect, useState } from 'react';
import { seconds } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Icon } from '../ui/icon';

export type StepKey = 'prepare' | 'transcribe' | 'extract' | 'verify';
export type StepState = { status: 'pending' | 'active' | 'done' | 'error'; ms?: number; startedAt?: number };

export const STEPS: { key: StepKey; label: string; detail: string }[] = [
  { key: 'prepare', label: 'Read and upload the audio', detail: 'Converted in your browser to 16 kHz mono' },
  { key: 'transcribe', label: 'Transcribe and tell the speakers apart', detail: 'Deepgram Nova-3 on Workers AI' },
  { key: 'extract', label: 'Find commitments and their final state', detail: 'gpt-oss-120b on Workers AI' },
  { key: 'verify', label: 'Check every quote against the transcript', detail: 'Plain code, no model' },
];

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

export function PipelineProgress({ steps }: { steps: Record<StepKey, StepState> }) {
  const now = useNow(Object.values(steps).some((s) => s.status === 'active'));
  return (
    <ol className="border-t-2 border-border-strong">
      {STEPS.map(({ key, label, detail }, i) => {
        const step = steps[key];
        const elapsed = step.status === 'active' && step.startedAt ? now - step.startedAt : step.ms;
        return (
          <li
            key={key}
            className={cn(
              'flex items-center gap-4 border-b-2 border-border-strong px-3 py-4 transition-colors',
              step.status === 'active' && 'bg-ink text-ink-contrast',
              step.status === 'error' && 'bg-danger-bg',
            )}
          >
            <span className={cn('w-5 shrink-0 text-caption', step.status === 'pending' ? 'text-subtle' : 'text-current')}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-label font-semibold', step.status === 'pending' && 'text-subtle')}>{label}</p>
              <p className={cn('text-caption', step.status === 'active' ? 'text-current opacity-70' : 'text-subtle')}>{detail}</p>
            </div>
            {elapsed !== undefined && <span className="font-mono text-caption tabular">{seconds(elapsed)}</span>}
            <span
              className={cn(
                'inline-flex size-7 shrink-0 items-center justify-center',
                step.status === 'done' && 'bg-accent text-on-accent',
                step.status === 'active' && 'text-ink-accent',
                step.status === 'pending' && 'border-2 border-border text-subtle',
                step.status === 'error' && 'bg-danger text-surface',
              )}
            >
              <Icon name={step.status === 'done' ? 'check' : step.status === 'active' ? 'spinner' : step.status === 'error' ? 'close' : 'open'} size={14} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
