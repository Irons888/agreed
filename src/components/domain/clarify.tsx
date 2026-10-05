import { useState, type ReactNode } from 'react';
import type { Result } from '../../../worker/types';
import { Button } from '../ui/button';
import { Icon, type IconName } from '../ui/icon';
import { SpeakerAvatar } from './speaker';
import { TimestampButton } from './timestamp';

function ClarifyShell({ icon, title, text, children, onDismiss }: { icon: IconName; title: string; text: string; children: ReactNode; onDismiss?: () => void }) {
  return (
    <section className="rounded-card border border-review-border bg-surface p-4" aria-label={title}>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-review-bg text-review">
          <Icon name={icon} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-title-3 font-semibold text-text">{title}</h2>
          <p className="mt-0.5 text-body text-muted">{text}</p>
          <div className="mt-3">{children}</div>
        </div>
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="rounded-sm p-1 text-subtle hover:bg-surface-muted hover:text-text" aria-label="Dismiss">
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
    </section>
  );
}

const inputStyle =
  'h-9 min-w-0 rounded-sm border border-border-strong bg-surface px-3 text-body text-text placeholder:text-subtle focus-visible:border-focus';

/** Speakers never said their names: ask, play a sample of each voice, nothing is reprocessed. */
export function SpeakerNamesCard({ result, onName }: { result: Result; onName: (speakerId: string, name: string) => void }) {
  const unnamed = result.speakers.filter((s) => !s.name);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (!unnamed.length) return null;
  return (
    <ClarifyShell
      icon="owner"
      title="Who is speaking?"
      text="Nobody said their name, so owners show as Speaker 1 and Speaker 2. Name them if you know who they are; the recording is not processed again."
    >
      <div className="space-y-2">
        {unnamed.map((speaker) => {
          const firstTurn = result.turns.find((t) => t.speaker === speaker.id);
          return (
            <form
              key={speaker.id}
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = drafts[speaker.id]?.trim();
                if (name) onName(speaker.id, name);
              }}
            >
              <SpeakerAvatar id={speaker.id} />
              <span className="w-20 text-body font-medium text-text">{speaker.label}</span>
              {firstTurn && (
                <TimestampButton id={`voice:${speaker.id}`} start={firstTurn.start} end={Math.min(firstTurn.end, firstTurn.start + 5)} label={`${speaker.label}'s voice`} />
              )}
              <input
                className={inputStyle}
                placeholder="Name"
                aria-label={`Name for ${speaker.label}`}
                value={drafts[speaker.id] ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [speaker.id]: e.target.value }))}
              />
              <Button type="submit" size="md">
                Save
              </Button>
            </form>
          );
        })}
      </div>
    </ClarifyShell>
  );
}

/** Relative deadlines can become dates once the user confirms when the recording was made. */
export function RecordingDateCard({ onDate, onDismiss }: { onDate: (iso: string) => void; onDismiss: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [value, setValue] = useState(today);
  return (
    <ClarifyShell
      icon="noDate"
      title="When was this recorded?"
      text="Deadlines like “by Wednesday” stay as spoken because the recording doesn't say what day it was. Give the date and they become calendar dates; the recording is not processed again."
      onDismiss={onDismiss}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => onDate(today)}>Today</Button>
        <input type="date" className={inputStyle} value={value} max={today} onChange={(e) => setValue(e.target.value)} aria-label="Recording date" />
        <Button variant="primary" onClick={() => value && onDate(value)}>
          Use this date
        </Button>
        <Button variant="ghost" onClick={onDismiss}>
          Keep as spoken
        </Button>
      </div>
    </ClarifyShell>
  );
}

/** Buttons shown on a "Needs review" card. */
export function ReviewActions({ onAgree, onKeep }: { onAgree: () => void; onKeep: () => void }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <span className="text-caption text-muted">Was this agreed?</span>
      <Button size="sm" icon="agreed" onClick={onAgree}>
        Count as agreed
      </Button>
      <Button size="sm" variant="ghost" onClick={onKeep}>
        Keep for review
      </Button>
    </div>
  );
}
