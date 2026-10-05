import type { Status } from '../../../worker/types';
import { cn } from '@/lib/cn';
import { Badge } from '../ui/badge';
import type { IconName } from '../ui/icon';
import { Tooltip } from '../ui/tooltip';

export const STATUS_META: Record<Status, { label: string; icon: IconName; className: string; dot: string; highlight: string; hint: string }> = {
  agreed: {
    label: 'Agreed',
    icon: 'agreed',
    className: 'border-agreed-border bg-agreed-bg text-agreed',
    dot: 'bg-agreed',
    highlight: 'bg-agreed-bg',
    hint: 'Someone committed to it, or accepted a request.',
  },
  open_question: {
    label: 'Open question',
    icon: 'question',
    className: 'border-question-border bg-question-bg text-question',
    dot: 'bg-question',
    highlight: 'bg-question-bg',
    hint: 'Asked, but still unanswered at the end of the recording.',
  },
  needs_review: {
    label: 'Needs review',
    icon: 'review',
    className: 'border-review-border bg-review-bg text-review',
    dot: 'bg-review',
    highlight: 'bg-review-bg',
    hint: 'The agreement is hedged or unclear, so it is not counted as agreed.',
  },
  not_accepted: {
    label: 'Not accepted',
    icon: 'notAccepted',
    className: 'border-dashed border-muted-status-border bg-transparent text-muted-status',
    dot: 'border border-dashed border-muted-status',
    highlight: 'bg-muted-status-bg',
    hint: 'Proposed, but nobody accepted it.',
  },
  cancelled: {
    label: 'Cancelled',
    icon: 'cancelled',
    className: 'border-muted-status-border bg-muted-status-bg text-muted-status',
    dot: 'bg-muted-status',
    highlight: 'bg-muted-status-bg',
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
        <Badge icon="changed" className={cn('border-muted-status-border bg-muted-status-bg text-muted-status')}>
          Changed
        </Badge>
      </span>
    </Tooltip>
  );
}
