import { Collapsible } from 'radix-ui';
import { useState, type ReactNode } from 'react';
import type { Item, Speaker } from '../../../worker/types';
import { cn } from '@/lib/cn';
import { decidingEvidence } from '@/lib/evidence';
import { Icon } from '../ui/icon';
import { VerificationList } from './checks';
import { CallDateForm } from './clarify';
import { DeadlineChange, DeadlineChip } from './deadline';
import { OwnerChip } from './owner';
import { QuoteBlock } from './quote';
import { StatusBadge } from './status';

/**
 * One item, simple by default: title, owner, deadline and the one quote that decides it, with ▶.
 * How it was decided (every quote, its role, the checks) waits under "Details".
 */
export function CommitmentCard({
  item,
  speakers,
  highlighted = false,
  onHighlight,
  defaultOpen = false,
  showStatus = false,
  onSetDate,
  actions,
}: {
  item: Item;
  speakers: Speaker[];
  highlighted?: boolean;
  onHighlight?: (id: string | null) => void;
  defaultOpen?: boolean;
  /** Only where the section title doesn't already say it, e.g. "Not accepted" vs "Cancelled". */
  showStatus?: boolean;
  /** Offered when a deadline is a weekday or "tomorrow" and the call date is unknown. */
  onSetDate?: (iso: string) => void;
  /** Extra controls under the quote, e.g. the review decision. */
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [askDate, setAskDate] = useState(false);
  const deciding = decidingEvidence(item);
  const others = item.evidence.filter((e) => e !== deciding);
  const cancelled = item.status === 'cancelled';
  const notAccepted = item.status === 'not_accepted';
  const showsFacts = !notAccepted && item.status !== 'open_question';
  const showOwner = !cancelled || item.owner.kind !== 'none';
  const showDeadline = !cancelled || item.deadline.kind !== 'none';
  const canDate = item.deadline.kind === 'relative' && !item.deadline.date && onSetDate;

  return (
    <article
      id={item.id}
      onMouseEnter={() => onHighlight?.(item.id)}
      onMouseLeave={() => onHighlight?.(null)}
      className={cn(
        'scroll-mt-6 border-2 border-border-strong p-5',
        cancelled ? 'bg-surface-muted' : 'bg-surface',
        notAccepted && 'border-dashed',
        highlighted && 'ring-4 ring-accent',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className={cn('heading text-title-3 text-text', (cancelled || notAccepted) && 'text-muted', cancelled && 'line-through decoration-2')}>
          {item.title}
        </h3>
        {showStatus && <StatusBadge status={item.status} size="sm" />}
      </div>

      {showsFacts && (showOwner || showDeadline) && (
        <dl className="mt-3 grid grid-facts items-start gap-x-3 gap-y-2">
          {showOwner && (
            <>
              <dt className="pt-0.5 text-caption text-muted">Owner</dt>
              <dd>
                <OwnerChip owner={item.owner} />
              </dd>
            </>
          )}
          {showDeadline && (
            <>
              <dt className="pt-0.5 text-caption text-muted">Deadline</dt>
              <dd>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <DeadlineChip deadline={item.deadline} />
                  {canDate && !askDate && (
                    <button
                      type="button"
                      onClick={() => setAskDate(true)}
                      className="text-caption font-semibold text-text underline decoration-2 underline-offset-2 hover:bg-accent hover:text-on-accent"
                    >
                      Set the call date
                    </button>
                  )}
                </div>
                <DeadlineChange previous={item.deadline.previous} />
                {canDate && askDate && <CallDateForm onDate={onSetDate} onCancel={() => setAskDate(false)} />}
              </dd>
            </>
          )}
        </dl>
      )}

      <QuoteBlock evidence={deciding} speakers={speakers} id={`${item.id}:q:deciding`} className="mt-4" />

      {actions}

      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <Collapsible.Trigger className="mt-4 inline-flex items-center gap-1 text-caption font-semibold text-muted hover:text-text">
          <Icon name={open ? 'expand' : 'open'} size={14} />
          {open ? 'Hide details' : 'Details'}
        </Collapsible.Trigger>
        <Collapsible.Content className="mt-3 space-y-4 border-t-2 border-border pt-4">
          {item.why && (
            <p className="text-body text-muted">
              <span className="font-semibold text-text">Why: </span>
              {item.why}
            </p>
          )}
          <QuoteBlock evidence={deciding} speakers={speakers} id={`${item.id}:q:deciding-detail`} detailed />
          {others.map((e, i) => (
            <QuoteBlock key={`${e.turn}-${e.start}`} evidence={e} speakers={speakers} id={`${item.id}:q:${i}`} detailed />
          ))}
          <div>
            <p className="mb-2 text-caption font-semibold text-text">Checked by code after the model answered</p>
            <VerificationList checks={item.checks} />
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </article>
  );
}
