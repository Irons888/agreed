import type { Deadline } from '../../../worker/types';
import { calendarDate, spoken } from '@/lib/format';
import { Icon } from '../ui/icon';
import { Tooltip } from '../ui/tooltip';

/** The deadline as a plain fact: a date, the exact wording, or an honest "unknown". */
export function DeadlineChip({ deadline }: { deadline: Deadline }) {
  const raw = deadline.raw ?? '';
  if (deadline.kind === 'none') {
    return (
      <span className="inline-flex items-center gap-1.5 text-label text-subtle">
        <Icon name="deadline" size={16} />
        No deadline agreed
      </span>
    );
  }
  if (deadline.kind === 'date' && deadline.date) {
    return (
      <Tooltip content={`Said: ${spoken(raw)}. Dated from the recording date.${deadline.ambiguous ? ' Some people mean the week after; check with the owner.' : ''}`}>
        <span className="inline-flex items-center gap-1.5 text-label font-semibold text-text">
          <Icon name="deadline" size={16} />
          {calendarDate(deadline.date)}
          <span className="font-normal text-subtle">{spoken(raw)}</span>
          {deadline.ambiguous && <span className="font-normal text-missing">· ambiguous</span>}
        </span>
      </Tooltip>
    );
  }
  if (deadline.kind === 'relative') {
    return (
      <Tooltip content="The recording doesn't say what day it was, so the deadline is kept exactly as spoken.">
        <span className="inline-flex flex-wrap items-center gap-x-1.5 text-label font-semibold text-text">
          <Icon name="noDate" size={16} className="text-missing" />
          {spoken(raw)}
          <span className="font-normal text-missing">· date unknown</span>
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip content="Not a calendar date; kept as spoken.">
      <span className="inline-flex items-center gap-1.5 text-label font-semibold text-text">
        <Icon name="deadline" size={16} />
        {spoken(raw)}
      </span>
    </Tooltip>
  );
}

/** "Moved from “by Thursday”", when an earlier deadline was replaced. */
export function DeadlineChange({ previous }: { previous: string[] }) {
  if (!previous.length) return null;
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-caption text-muted">
      <Icon name="changed" size={14} />
      Moved from
      {previous.map((p, i) => (
        <span key={p} className="line-through">
          {spoken(p)}
          {i < previous.length - 1 ? ',' : ''}
        </span>
      ))}
    </span>
  );
}
