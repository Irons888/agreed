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
    <ol className="space-y-3">
      {STEPS.map(({ key, label, detail }) => {
        const step = steps[key];
        const elapsed = step.status === 'active' && step.startedAt ? now - step.startedAt : step.ms;
        return (
          <li key={key} className="flex items-start gap-3">
            <span
              className={cn(
                'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border',
                step.status === 'done' && 'border-agreed-border bg-agreed-bg text-agreed',
                step.status === 'active' && 'border-ink text-text',
                step.status === 'pending' && 'border-border text-subtle',
                step.status === 'error' && 'border-danger bg-danger-bg text-danger',
              )}
            >
              <Icon name={step.status === 'done' ? 'check' : step.status === 'active' ? 'spinner' : step.status === 'error' ? 'close' : 'open'} size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-body font-medium', step.status === 'pending' ? 'text-subtle' : 'text-text')}>{label}</p>
              <p className="text-caption text-subtle">{detail}</p>
            </div>
            {elapsed !== undefined && <span className="font-mono text-caption text-muted tabular">{seconds(elapsed)}</span>}
          </li>
        );
      })}
    </ol>
  );
}
