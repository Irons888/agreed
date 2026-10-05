import { Collapsible } from 'radix-ui';
import { useState, type ReactNode } from 'react';
import type { Evidence, EvidenceRole, Item, Speaker, Status } from '../../../worker/types';
import { plural } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge } from '../ui/badge';
import { Icon } from '../ui/icon';
import { VerificationList } from './checks';
import { DeadlineChange, DeadlineChip } from './deadline';
import { OwnerChip } from './owner';
import { QuoteBlock } from './quote';
import { ChangedBadge, StatusBadge } from './status';
import { TimestampButton } from './timestamp';

const DECIDING: Record<Status, EvidenceRole[]> = {
  agreed: ['acceptance', 'commitment'],
  cancelled: ['cancellation'],
  not_accepted: ['rejection', 'proposal'],
  open_question: ['question'],
  needs_review: ['hedge', 'commitment', 'acceptance'],
};

/** The quote that decides the final state: the last acceptance for a task, the cancellation, the question… */
export function decidingEvidence(item: Item): Evidence {
  for (const role of DECIDING[item.status]) {
    const found = [...item.evidence].reverse().find((e) => e.role === role);
    if (found) return found;
  }
  return item.evidence[item.evidence.length - 1];
}

export function CommitmentCard({
  item,
  speakers,
  highlighted = false,
  onHighlight,
  defaultOpen = false,
  actions,
}: {
  item: Item;
  speakers: Speaker[];
  highlighted?: boolean;
  onHighlight?: (id: string | null) => void;
  defaultOpen?: boolean;
  /** Extra controls at the bottom, e.g. the review decision. */
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const deciding = decidingEvidence(item);
  const others = item.evidence.filter((e) => e !== deciding);
  const corrections = item.checks.filter((c) => !c.ok).length;
  const inactive = item.status === 'cancelled' || item.status === 'not_accepted';
  const showsOwnership = item.status !== 'not_accepted' && item.status !== 'open_question';

  return (
    <article
      id={item.id}
      onMouseEnter={() => onHighlight?.(item.id)}
      onMouseLeave={() => onHighlight?.(null)}
      className={cn(
        'scroll-mt-6 rounded-card border bg-surface p-4 shadow-xs transition-shadow hover:shadow-md',
        highlighted ? 'border-focus' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={item.status} />
          {item.deadline.previous.length > 0 && <ChangedBadge from={item.deadline.previous} to={item.deadline.raw} />}
          {corrections > 0 && (
            <Badge icon="checks" className="text-muted">
              {plural(corrections, 'correction')}
            </Badge>
          )}
        </div>
        <TimestampButton id={`${item.id}:deciding`} start={deciding.start} end={deciding.end} label={`the quote for ${item.title}`} />
      </div>

      <h3 className={cn('mt-2.5 text-title-3 font-semibold text-text', inactive && 'text-muted', item.status === 'cancelled' && 'line-through decoration-1')}>
        {item.title}
      </h3>

      {showsOwnership && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {/* A cancelled task only shows what it was; missing owner or date no longer matters. */}
          {(item.status !== 'cancelled' || item.owner.kind !== 'none') && <OwnerChip owner={item.owner} />}
          {(item.status !== 'cancelled' || item.deadline.kind !== 'none') && <DeadlineChip deadline={item.deadline} />}
        </div>
      )}
      {showsOwnership && <DeadlineChange previous={item.deadline.previous} current={item.deadline.raw} />}

      <QuoteBlock evidence={deciding} speakers={speakers} id={`${item.id}:q:deciding`} className="mt-3" />

      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <Collapsible.Trigger className="mt-3 inline-flex items-center gap-1 rounded-sm text-label font-medium text-muted hover:text-text">
          <Icon name={open ? 'expand' : 'open'} size={14} />
          Why this status{others.length ? ` · ${plural(others.length, 'more quote')}` : ''}
        </Collapsible.Trigger>
        <Collapsible.Content className="mt-3 space-y-3 border-t border-border pt-3">
          {item.why && <p className="text-body text-muted">{item.why}</p>}
          {others.map((e, i) => (
            <QuoteBlock key={`${e.turn}-${e.start}`} evidence={e} speakers={speakers} id={`${item.id}:q:${i}`} />
          ))}
          <VerificationList checks={item.checks} />
        </Collapsible.Content>
      </Collapsible.Root>
      {actions}
    </article>
  );
}
