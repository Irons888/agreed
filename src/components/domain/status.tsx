import type { Status } from '../../../worker/types';
import { Badge } from '../ui/badge';
import type { IconName } from '../ui/icon';
import { Tooltip } from '../ui/tooltip';

export const STATUS_META: Record<Status, { label: string; icon: IconName; className: string; dot: string; highlight: string; hint: string }> = {
  agreed: {
    label: 'Agreed',
    icon: 'agreed',
    className: 'border-agreed-border bg-agreed-bg text-agreed',
    dot: 'bg-agreed-bg border border-agreed-border',
    highlight: 'bg-agreed-bg text-agreed',
    hint: 'Someone committed to it, or accepted a request.',
  },
  open_question: {
    label: 'Open question',
    icon: 'question',
    className: 'border-question-border bg-question-bg text-question',
    dot: 'bg-question-bg',
    highlight: 'bg-question-bg text-question',
    hint: 'Asked, but still unanswered at the end of the recording.',
  },
  needs_review: {
    label: 'Needs review',
    icon: 'review',
    className: 'border-review-border bg-review-bg text-review',
    dot: 'bg-review-bg',
    highlight: 'bg-review-bg text-review',
    hint: 'The agreement is hedged or unclear, so it is not counted as agreed.',
  },
  not_accepted: {
    label: 'Not accepted',
    icon: 'notAccepted',
    className: 'border-dashed border-border-strong bg-transparent text-text',
    dot: 'border border-dashed border-border-strong',
    highlight: 'bg-muted-status-bg text-muted-status',
    hint: 'Proposed, but nobody accepted it.',
  },
  cancelled: {
    label: 'Cancelled',
    icon: 'cancelled',
    className: 'border-muted-status-border bg-muted-status-bg text-muted-status',
    dot: 'bg-muted-status-bg border border-muted-status-border',
    highlight: 'bg-muted-status-bg text-muted-status line-through',
    hint: 'Agreed first, then called off.',
  },
};

/** Status is always icon plus word, never colour alone. */
export function StatusBadge({ status, size = 'md' }: { status: Status; size?: 'sm' | 'md' }) {
  const meta = STATUS_META[status];
  return (
    <Tooltip content={meta.hint}>
      <span className="inline-flex">
        <Badge icon={meta.icon} size={size} className={meta.className}>
          {meta.label}
        </Badge>
      </span>
    </Tooltip>
  );
}

export function ChangedBadge({ from, to }: { from: string[]; to: string | null }) {
  return (
    <Tooltip content={`Deadline changed: ${[...from, to ?? '—'].join(' → ')}`}>
      <span className="inline-flex">
        <Badge icon="changed">Moved</Badge>
      </span>
    </Tooltip>
  );
}
