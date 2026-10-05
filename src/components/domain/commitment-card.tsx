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
  const cancelled = item.status === 'cancelled';
  const notAccepted = item.status === 'not_accepted';
  const showsFacts = !notAccepted && item.status !== 'open_question';
  const showOwner = !cancelled || item.owner.kind !== 'none';
  const showDeadline = !cancelled || item.deadline.kind !== 'none';

  return (
    <article
      id={item.id}
      onMouseEnter={() => onHighlight?.(item.id)}
      onMouseLeave={() => onHighlight?.(null)}
      className={cn(
        'scroll-mt-6 border-2 border-border-strong p-5 transition-shadow',
        cancelled ? 'bg-surface-muted' : 'bg-surface',
        notAccepted && 'border-dashed',
        highlighted && 'ring-4 ring-accent',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          {item.deadline.previous.length > 0 && <ChangedBadge from={item.deadline.previous} to={item.deadline.raw} />}
        </div>
        <TimestampButton id={`${item.id}:deciding`} start={deciding.start} end={deciding.end} label={`the quote for ${item.title}`} />
      </div>

      <h3 className={cn('mt-3 font-display text-title-3 font-bold text-text', (cancelled || notAccepted) && 'text-muted', cancelled && 'line-through decoration-2')}>
        {item.title}
      </h3>

      {showsFacts && (showOwner || showDeadline) && (
        <dl className="mt-3 grid grid-facts items-start gap-x-3 gap-y-2">
          {showOwner && (
            <>
              <dt className="tag-label pt-0.5 text-subtle">Owner</dt>
              <dd>
                <OwnerChip owner={item.owner} />
              </dd>
            </>
          )}
          {showDeadline && (
            <>
              <dt className="tag-label pt-0.5 text-subtle">Deadline</dt>
              <dd>
                <DeadlineChip deadline={item.deadline} />
                <DeadlineChange previous={item.deadline.previous} current={item.deadline.raw} />
              </dd>
            </>
          )}
        </dl>
      )}

      <QuoteBlock evidence={deciding} speakers={speakers} id={`${item.id}:q:deciding`} className="mt-4" />

      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t-2 border-border pt-3">
          <Collapsible.Trigger className="tag-label inline-flex items-center gap-1.5 text-text hover:underline">
            <Icon name={open ? 'expand' : 'open'} size={14} />
            Why this status{others.length ? ` · ${plural(others.length, 'more quote')}` : ''}
          </Collapsible.Trigger>
          {corrections > 0 ? (
            <Badge icon="checks" className="border-review-border bg-review-bg text-review">
              {plural(corrections, 'correction')}
            </Badge>
          ) : (
            <span className="tag-label inline-flex items-center gap-1 text-subtle">
              <Icon name="verified" size={14} />
              All checks passed
            </span>
          )}
        </div>
        <Collapsible.Content className="mt-4 space-y-4">
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
