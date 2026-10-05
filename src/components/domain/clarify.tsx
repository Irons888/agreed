import { useState, type ReactNode } from 'react';
import type { Result } from '../../../worker/types';
import { Button } from '../ui/button';
import { Icon, type IconName } from '../ui/icon';
import { SpeakerAvatar } from './speaker';
import { TimestampButton } from './timestamp';

function ClarifyShell({ icon, title, text, children, onDismiss }: { icon: IconName; title: string; text: string; children: ReactNode; onDismiss?: () => void }) {
  return (
    <section className="border-2 border-border-strong bg-surface" aria-label={title}>
      <div className="flex items-center justify-between gap-3 bg-review-bg px-4 py-2 text-review">
        <span className="tag-label inline-flex items-center gap-1.5">
          <Icon name={icon} size={14} />
          Needs your input
        </span>
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="inline-flex size-7 items-center justify-center hover:bg-review-border" aria-label="Dismiss">
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
      <div className="p-5">
        <h2 className="headline text-title-2 text-text">{title}</h2>
        <p className="mt-2 max-w-2xl text-body text-muted">{text}</p>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

const inputStyle =
  'h-11 min-w-0 border-2 border-border-strong bg-surface px-3 text-body text-text placeholder:text-subtle focus-visible:border-focus';

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
              <span className="tag-label w-24 text-text">{speaker.label}</span>
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
              <Button type="submit" size="md" variant="ink">
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
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-border-strong pt-4">
      <span className="tag-label mr-1 text-text">Was this agreed?</span>
      <Button size="sm" variant="primary" icon="agreed" onClick={onAgree}>
        Count as agreed
      </Button>
      <Button size="sm" variant="ghost" onClick={onKeep}>
        Keep for review
      </Button>
    </div>
  );
}
