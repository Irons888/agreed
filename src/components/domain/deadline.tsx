import type { Deadline } from '../../../worker/types';
import { calendarDate, spoken } from '@/lib/format';
import { Badge } from '../ui/badge';
import { Icon } from '../ui/icon';
import { Tooltip } from '../ui/tooltip';

export function DeadlineChip({ deadline }: { deadline: Deadline }) {
  const raw = deadline.raw ?? '';
  if (deadline.kind === 'none') {
    return (
      <Badge icon="deadline" className="text-subtle">
        No deadline agreed
      </Badge>
    );
  }
  if (deadline.kind === 'date' && deadline.date) {
    const note = deadline.ambiguous ? ' Some people mean the week after; check with the owner.' : '';
    return (
      <Tooltip content={`Said: ${spoken(raw)}. Dated from the recording date.${note}`}>
        <span className="inline-flex">
          <Badge icon="deadline" className={deadline.ambiguous ? 'border-review-border text-review' : 'text-text'}>
            {calendarDate(deadline.date)}
            {deadline.ambiguous ? ' (ambiguous)' : ''}
          </Badge>
        </span>
      </Tooltip>
    );
  }
  if (deadline.kind === 'relative') {
    return (
      <Tooltip content="The recording doesn't say what day it was, so the deadline is kept exactly as spoken.">
        <span className="inline-flex max-w-full">
          <Badge icon="noDate" className="border-dashed border-missing-border bg-transparent text-missing">
            {spoken(raw)} · date context missing
          </Badge>
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip content="Not a calendar date; kept as spoken.">
      <span className="inline-flex max-w-full">
        <Badge icon="deadline" className="text-text">
          {spoken(raw)}
        </Badge>
      </span>
    </Tooltip>
  );
}

/** "Changed: Thursday → Monday" under the deadline, when an earlier deadline was replaced. */
export function DeadlineChange({ previous, current }: { previous: string[]; current: string | null }) {
  if (!previous.length) return null;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-caption text-muted">
      <Icon name="changed" size={14} />
      <span>Deadline changed:</span>
      {previous.map((p) => (
        <span key={p} className="text-subtle line-through">
          {spoken(p)}
        </span>
      ))}
      <Icon name="next" size={14} />
      <span className="font-medium text-text">{current ? spoken(current) : '—'}</span>
    </p>
  );
}
