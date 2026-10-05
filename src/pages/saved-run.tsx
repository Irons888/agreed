import { useEffect, useState } from 'react';
import type { Result } from '../../worker/types';
import { Page } from '@/components/domain/layout';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { prepareSample } from '@/lib/audio/prepare';
import { forgetRun } from '@/lib/history';
import { RunPage, type RunState } from './run';

/** Opens a stored result from its link: the result JSON plus the recording, decoded for the waveform. */
export function SavedRunPage({ id, onNew, onDelete }: { id: string; onNew: () => void; onDelete: (id: string) => Promise<void> }) {
  const [run, setRun] = useState<RunState | null>(null);
  const [missing, setMissing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/runs/${id}`);
      if (!res.ok) {
        // Deleted or expired: it no longer belongs in this browser's history.
        if (res.status === 404) forgetRun(id);
        throw new Error((await res.json().catch(() => null))?.error ?? 'This result could not be loaded.');
      }
      const result = (await res.json()) as Result;
      const audio = await prepareSample(`/api/runs/${id}/audio`, result.fileName ?? 'recording.wav');
      if (cancelled) return;
      setRun({
        key: 0,
        audio,
        steps: { prepare: { status: 'done' }, transcribe: { status: 'done' }, extract: { status: 'done' }, verify: { status: 'done' } },
        transcript: { speakers: result.speakers, turns: result.turns },
        result,
        error: null,
        clientMs: result.metrics.timings.totalMs,
      });
    })().catch((err: unknown) => !cancelled && setMissing(err instanceof Error ? err.message : 'This result could not be loaded.'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (missing) {
    return (
      <Page>
        <div className="border-2 border-border-strong bg-surface p-6 sm:p-10">
          <span className="inline-flex size-11 items-center justify-center border-2 border-border-strong text-text">
            <Icon name="noDate" size={20} />
          </span>
          <h1 className="heading mt-6 text-title-2 text-text">{missing}</h1>
          <p className="mt-3 text-body text-muted">Results are kept for 30 days, or until someone deletes them.</p>
          <Button variant="primary" icon="upload" className="mt-6" onClick={onNew}>
            Analyze a recording
          </Button>
        </div>
      </Page>
    );
  }
  if (!run) {
    return (
      <Page>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-12 w-2/3" />
        <div className="mt-10 grid gap-6 lg:grid-split">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </Page>
    );
  }
  return <RunPage run={run} onNew={onNew} onRetry={onNew} onDelete={onDelete} />;
}
