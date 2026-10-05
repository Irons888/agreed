import { useEffect, useState } from 'react';
import type { Result, Speaker, Turn } from '../../worker/types';
import { ReviewActions, SpeakerNamesCard } from '@/components/domain/clarify';
import { Page } from '@/components/domain/layout';
import { PlayerBar } from '@/components/domain/player-bar';
import { PrivacyNote } from '@/components/domain/privacy';
import { PipelineProgress, type StepKey, type StepState } from '@/components/domain/progress';
import { RunDetails } from '@/components/domain/run-details';
import { RunHeader } from '@/components/domain/run-header';
import { ItemSections, SummaryLine } from '@/components/domain/sections';
import { DeclineState, EmptyResult, ErrorState } from '@/components/domain/states';
import { TranscriptView } from '@/components/domain/transcript';
import { WaveformTimeline } from '@/components/domain/waveform';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayerProvider } from '@/lib/audio/player';
import type { PreparedAudio } from '@/lib/audio/prepare';
import { applyEdits, decideReview, nameSpeaker, setRecordingDate } from '@/lib/clarify';
import { cn } from '@/lib/cn';
import { downloadJson, toMarkdown } from '@/lib/export';
import { editsFor, rememberEdit, rememberRun, type Edits } from '@/lib/history';

export type RunState = {
  key: number;
  audio: PreparedAudio;
  steps: Record<StepKey, StepState>;
  transcript: { speakers: Speaker[]; turns: Turn[] } | null;
  result: Result | null;
  error: string | null;
  clientMs: number | null;
};

/** The recording itself: player, waveform and the transcript with every quote highlighted. Folded on phones. */
function TranscriptPanel({ run, result, highlighted, onHighlight }: { run: RunState; result: Result | null; highlighted: string | null; onHighlight: (id: string | null) => void }) {
  const [shown, setShown] = useState(false);
  const speakers = result?.speakers ?? run.transcript?.speakers ?? [];
  const turns = result?.turns ?? run.transcript?.turns ?? [];
  return (
    <aside aria-label="Recording and transcript" className="surface-dark">
      <div className="space-y-3 border-b-2 border-border p-4">
        <PlayerBar duration={run.audio.duration} />
        <WaveformTimeline peaks={run.audio.peaks} duration={run.audio.duration} turns={turns} />
      </div>
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-expanded={shown}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-label font-semibold lg:hidden"
      >
        {shown ? 'Hide the transcript' : 'Show the transcript'}
        <Icon name="expand" size={16} className={cn('transition-transform', shown && 'rotate-180')} />
      </button>
      <div className={cn('p-4 lg:block lg:max-h-screen lg:overflow-y-auto', !shown && 'hidden')}>
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
  // Answers given earlier (names, call date, review decisions) are kept in the history and applied again.
  const withEdits = (r: Result | null) => (r ? applyEdits(r, editsFor(r.id)) : null);
  const [result, setResult] = useState<Result | null>(() => withEdits(run.result));
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resultKey, setResultKey] = useState(run.result);
  if (run.result !== resultKey) {
    setResultKey(run.result);
    setResult(withEdits(run.result));
  }

  // Every result opened here goes into this browser's history.
  useEffect(() => {
    if (result) rememberRun(result, run.audio.name);
    // Only when a result arrives; answers are saved by `answer` below.
  }, [result?.id]);

  const answer = (next: Result, change: Edits) => {
    setResult(next);
    rememberEdit(next, run.audio.name, change);
  };

  // Opened from the Tasks page (/r/:id#item): bring that item into view and mark it for a moment.
  useEffect(() => {
    const target = decodeURIComponent(window.location.hash.slice(1));
    if (!result || !target) return;
    const card = document.getElementById(target);
    if (!card) return;
    card.scrollIntoView({ block: 'center' });
    setHighlighted(target);
    const timer = setTimeout(() => setHighlighted(null), 2500);
    return () => clearTimeout(timer);
  }, [result?.id]);

  const speakers = result?.speakers ?? run.transcript?.speakers ?? [];
  const declined = result?.outcome === 'decline';
  const dateUnknown = result?.clarifications.some((c) => c.kind === 'recording_date');

  const actions = (
    <>
      {result && !declined && (
        <Button
          icon={copied ? 'check' : 'copy'}
          onClick={async () => {
            await navigator.clipboard.writeText(toMarkdown(result, run.audio.name));
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? 'Copied' : 'Copy the list'}
        </Button>
      )}
      {(result || run.error) && (
        <Button variant="primary" icon="upload" onClick={onNew}>
          New recording
        </Button>
      )}
    </>
  );

  return (
    <PlayerProvider url={run.audio.url} duration={run.audio.duration}>
      <Page>
        <RunHeader fileName={run.audio.name} durationSec={run.audio.duration} speakers={speakers} actions={actions} />

        {run.error && (
          <div className="mt-8">
            <ErrorState message={run.error} onRetry={onRetry} onNew={onNew} />
          </div>
        )}

        {!run.error && !result && (
          <div className="mt-8 grid gap-6 lg:grid-split lg:items-start">
            <section className="border-2 border-border-strong bg-surface p-5" aria-live="polite">
              <h2 className="heading text-title-2 text-text">Working on it</h2>
              <p className="mt-1 text-body text-muted">The transcript appears first; the list follows in 20–30 seconds.</p>
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
          <div className="mt-8 grid gap-8 lg:grid-split lg:items-start">
            <div className="min-w-0 space-y-8">
              {result.items.length > 0 && <SummaryLine items={result.items} />}
              {result.clarifications.some((c) => c.kind === 'speaker_names') && (
                <SpeakerNamesCard result={result} onName={(id, name) => answer(nameSpeaker(result, id, name), { names: { [id]: name } })} />
              )}
              {result.items.length ? (
                <ItemSections
                  items={result.items}
                  speakers={result.speakers}
                  highlighted={highlighted}
                  onHighlight={setHighlighted}
                  onSetDate={dateUnknown ? (iso) => answer(setRecordingDate(result, iso), { date: iso }) : undefined}
                  actionsFor={(item) =>
                    item.status === 'needs_review' && result.clarifications.some((c) => c.kind === 'review_items' && c.items.includes(item.id)) ? (
                      <ReviewActions
                        onAgree={() => answer(decideReview(result, item.id, true), { reviews: { [item.id]: true } })}
                        onKeep={() => answer(decideReview(result, item.id, false), { reviews: { [item.id]: false } })}
                      />
                    ) : null
                  }
                />
              ) : (
                <EmptyResult />
              )}
              <RunDetails result={result} clientMs={run.clientMs} onDownload={() => downloadJson(result, run.audio.name)} />
              {onDelete && <PrivacyNote onDelete={() => onDelete(result.id)} />}
            </div>
            <TranscriptPanel run={run} result={result} highlighted={highlighted} onHighlight={setHighlighted} />
          </div>
        )}
      </Page>
    </PlayerProvider>
  );
}
