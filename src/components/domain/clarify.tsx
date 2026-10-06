import { useState } from 'react';
import type { Result } from '../../../worker/types';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { SpeakerAvatar } from './speaker';
import { TimestampButton } from './timestamp';

/** The one style for text and date inputs. */
export const inputStyle =
  'h-9 min-w-0 border-2 border-border-strong bg-surface px-2.5 text-body text-text placeholder:text-subtle focus-visible:border-focus';

/** Speakers never said their names: ask once, with a sample of each voice. Nothing is processed again. */
export function SpeakerNamesCard({ result, onName }: { result: Result; onName: (speakerId: string, name: string) => void }) {
  const unnamed = result.speakers.filter((s) => !s.name);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (!unnamed.length) return null;
  return (
    <section aria-label="Name the speakers" className="border-2 border-review-border bg-surface p-4">
      <p className="flex items-center gap-2 text-label font-semibold text-text">
        <Icon name="owner" size={16} className="text-missing" />
        Nobody said their name
      </p>
      <p className="mt-1 text-caption text-muted">Owners show as Speaker 1 and Speaker 2. Name them if you know who is who.</p>
      <div className="mt-3 space-y-2">
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
              <span className="w-20 text-label font-semibold text-text">{speaker.label}</span>
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
              <Button type="submit" size="sm" variant="ink">
                Save
              </Button>
            </form>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Shown under a deadline like “by Wednesday” when the recording doesn't say what day it was.
 * The date applies to every deadline at once; the recording is not processed again.
 */
export function CallDateForm({ onDate, onCancel }: { onDate: (iso: string) => void; onCancel: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [value, setValue] = useState(today);
  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value) onDate(value);
      }}
    >
      <label className="text-caption text-muted">
        The call was on{' '}
        <input type="date" className={inputStyle} value={value} max={today} onChange={(e) => setValue(e.target.value)} />
      </label>
      <Button type="submit" size="sm" variant="ink">
        Apply
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}

/** Buttons on an item that needs your check. */
export function ReviewActions({ onAgree, onKeep }: { onAgree: () => void; onKeep: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-label font-semibold text-text">Was this agreed?</span>
      <Button size="sm" variant="primary" icon="agreed" onClick={onAgree}>
        Count as agreed
      </Button>
      <Button size="sm" variant="ghost" onClick={onKeep}>
        Not sure yet
      </Button>
    </div>
  );
}
