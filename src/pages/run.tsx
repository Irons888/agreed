import { useState } from 'react';
import type { Result, Speaker, Turn } from '../../worker/types';
import { RecordingDateCard, ReviewActions, SpeakerNamesCard } from '@/components/domain/clarify';
import { Page } from '@/components/domain/layout';
import { CostBreakdown } from '@/components/domain/metrics';
import { PlayerBar } from '@/components/domain/player-bar';
import { PrivacyNote } from '@/components/domain/privacy';
import { PipelineProgress, type StepKey, type StepState } from '@/components/domain/progress';
import { RunHeader } from '@/components/domain/run-header';
import { CountersBar, ItemSections } from '@/components/domain/sections';
import { DeclineState, EmptyResult, ErrorState } from '@/components/domain/states';
import { TranscriptView } from '@/components/domain/transcript';
import { WaveformTimeline } from '@/components/domain/waveform';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayerProvider } from '@/lib/audio/player';
import type { PreparedAudio } from '@/lib/audio/prepare';
import { decideReview, nameSpeaker, setRecordingDate } from '@/lib/clarify';
import { downloadJson, toMarkdown } from '@/lib/export';

export type RunState = {
  key: number;
  audio: PreparedAudio;
  steps: Record<StepKey, StepState>;
  transcript: { speakers: Speaker[]; turns: Turn[] } | null;
  result: Result | null;
  error: string | null;
  clientMs: number | null;
};

function TranscriptPanel({ run, result, highlighted, onHighlight }: { run: RunState; result: Result | null; highlighted: string | null; onHighlight: (id: string | null) => void }) {
  const speakers = result?.speakers ?? run.transcript?.speakers ?? [];
  const turns = result?.turns ?? run.transcript?.turns ?? [];
  return (
    <aside aria-label="Recording and transcript" className="rounded-panel border border-border bg-surface">
      <div className="space-y-3 border-b border-border p-4">
        <PlayerBar duration={run.audio.duration} />
        <WaveformTimeline
          peaks={run.audio.peaks}
          duration={run.audio.duration}
          turns={turns}
          items={result?.items}
          highlighted={highlighted}
          onHighlight={onHighlight}
        />
      </div>
      <div className="p-4 lg:max-h-screen lg:overflow-y-auto">
        {turns.length ? (
          <TranscriptView turns={turns} speakers={speakers} items={result?.items} highlighted={highlighted} onHighlight={onHighlight} />
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
      </div>
    </aside>
  );
}

export function RunPage({ run, onNew, onRetry, onDelete }: { run: RunState; onNew: () => void; onRetry: () => void; onDelete?: (id: string) => Promise<void> }) {
  const [result, setResult] = useState<Result | null>(run.result);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [dateDismissed, setDateDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resultKey, setResultKey] = useState(run.result);
  // A new server result replaces local edits.
  if (run.result !== resultKey) {
    setResultKey(run.result);
    setResult(run.result);
  }

  const speakers = result?.speakers ?? run.transcript?.speakers ?? [];
  const declined = result?.outcome === 'decline';

  const actions = result && !declined && (
    <>
      <Button
        icon={copied ? 'check' : 'copy'}
        onClick={async () => {
          await navigator.clipboard.writeText(toMarkdown(result, run.audio.name));
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
      >
        {copied ? 'Copied' : 'Copy as Markdown'}
      </Button>
      <Button icon="download" onClick={() => downloadJson(result, run.audio.name)}>
        JSON
      </Button>
      <Button variant="primary" icon="upload" onClick={onNew}>
        New recording
      </Button>
    </>
  );

  return (
    <PlayerProvider url={run.audio.url} duration={run.audio.duration}>
      <Page>
        <RunHeader fileName={run.audio.name} durationSec={run.audio.duration} speakers={speakers} result={result} clientMs={run.clientMs} actions={actions} />

        {result && onDelete && (
          <div className="mt-6">
            <PrivacyNote onDelete={() => onDelete(result.id)} />
          </div>
        )}

        {run.error && (
          <div className="mt-8">
            <ErrorState message={run.error} onRetry={onRetry} onNew={onNew} />
          </div>
        )}

        {!run.error && !result && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
            <section className="rounded-panel border border-border bg-surface p-5" aria-live="polite">
              <h2 className="text-title-2 font-semibold text-text">Working on it</h2>
              <p className="mt-1 text-body text-muted">Every step runs live on this recording. The transcript appears first.</p>
              <div className="mt-5">
                <PipelineProgress steps={run.steps} />
              </div>
            </section>
            <TranscriptPanel run={run} result={null} highlighted={null} onHighlight={() => {}} />
          </div>
        )}

        {result && declined && (
          <div className="mt-8 space-y-6">
            <DeclineState result={result} onNew={onNew} />
            {result.turns.length > 0 && <TranscriptPanel run={run} result={result} highlighted={null} onHighlight={() => {}} />}
          </div>
        )}

        {result && !declined && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
            <div className="min-w-0 space-y-6">
              {result.clarifications.some((c) => c.kind === 'speaker_names') && (
                <SpeakerNamesCard result={result} onName={(id, name) => setResult(nameSpeaker(result, id, name))} />
              )}
              {!dateDismissed && result.clarifications.some((c) => c.kind === 'recording_date') && (
                <RecordingDateCard onDate={(iso) => setResult(setRecordingDate(result, iso))} onDismiss={() => setDateDismissed(true)} />
              )}
              <CountersBar items={result.items} />
              {result.items.length ? (
                <ItemSections
                  items={result.items}
                  speakers={result.speakers}
                  highlighted={highlighted}
                  onHighlight={setHighlighted}
                  actionsFor={(item) =>
                    item.status === 'needs_review' && result.clarifications.some((c) => c.kind === 'review_items' && c.items.includes(item.id)) ? (
                      <ReviewActions onAgree={() => setResult(decideReview(result, item.id, true))} onKeep={() => setResult(decideReview(result, item.id, false))} />
                    ) : null
                  }
                />
              ) : (
                <EmptyResult />
              )}
              {result.dropped.length > 0 && (
                <p className="flex items-start gap-2 text-caption text-muted">
                  <Icon name="checks" size={14} className="mt-px" />
                  Removed by verification: {result.dropped.map((d) => `“${d.title}” (${d.reason.toLowerCase()})`).join('; ')}
                </p>
              )}
              <details className="rounded-card border border-border bg-surface p-4">
                <summary className="cursor-pointer text-label font-medium text-text">Time and cost of this run</summary>
                <div className="mt-3">
                  <CostBreakdown metrics={result.metrics} />
                </div>
              </details>
            </div>
            <TranscriptPanel run={run} result={result} highlighted={highlighted} onHighlight={setHighlighted} />
          </div>
        )}
      </Page>
    </PlayerProvider>
  );
}
