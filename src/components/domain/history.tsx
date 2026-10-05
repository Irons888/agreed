import type { Status } from '../../../worker/types';
import type { HistoryEntry, TaskSummary } from '@/lib/history';
import { isExpired } from '@/lib/history';
import { clock, plural } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '../ui/icon';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** "3 agreed tasks · 1 open question · 2 not counted", or why the recording was declined. */
export function entrySummary(entry: HistoryEntry): string {
  if (entry.outcome === 'decline') return entry.note ?? 'Declined';
  const n = (statuses: Status[]) => entry.items.filter((i) => statuses.includes(i.status)).length;
  const parts = [plural(n(['agreed']), 'agreed task')];
  if (n(['needs_review'])) parts.push(`${n(['needs_review'])} to check`);
  if (n(['open_question'])) parts.push(plural(n(['open_question']), 'open question'));
  if (n(['not_accepted', 'cancelled'])) parts.push(`${n(['not_accepted', 'cancelled'])} not counted`);
  return parts.join(' · ');
}

/** One analysed recording in the history. */
export function RecordingRow({ entry, onOpen, onForget }: { entry: HistoryEntry; onOpen: () => void; onForget?: () => void }) {
  const expired = isExpired(entry);
  return (
    <li className="flex items-center gap-4 border-b-2 border-border py-4 last:border-b-0">
      <span className={cn('inline-flex size-10 shrink-0 items-center justify-center', expired ? 'bg-surface-muted text-subtle' : 'bg-ink text-ink-accent')}>
        <Icon name="file" size={20} />
      </span>
      <div className="min-w-0 flex-1">
        {expired ? (
          <p className="truncate text-label font-semibold text-muted">{entry.fileName}</p>
        ) : (
          <a
            href={`/r/${entry.id}`}
            onClick={(e) => {
              e.preventDefault();
              onOpen();
            }}
            className="block truncate text-label font-semibold text-text hover:underline"
          >
            {entry.fileName}
          </a>
        )}
        <p className="mt-0.5 text-caption text-muted">
          {when(entry.createdAt)} · {clock(entry.durationSec)} · {expired ? 'expired after 30 days' : entrySummary(entry)}
        </p>
      </div>
      {expired && onForget ? (
        <button type="button" onClick={onForget} className="text-caption font-semibold text-muted underline underline-offset-2 hover:text-text">
          Remove
        </button>
      ) : (
        <Icon name="open" size={16} className="text-subtle" />
      )}
    </li>
  );
}

const MARK: Record<Status, { icon: IconName; className: string }> = {
  agreed: { icon: 'check', className: 'border-border-strong bg-agreed-bg text-agreed' },
  needs_review: { icon: 'review', className: 'border-review-border bg-review-bg text-review' },
  open_question: { icon: 'question', className: 'border-question-border bg-question-bg text-question' },
  not_accepted: { icon: 'notAccepted', className: 'border-dashed border-border-strong text-muted' },
  cancelled: { icon: 'cancelled', className: 'border-border-strong bg-muted-status-bg text-muted-status' },
};

/** A task written out on one line: what, who, by when, and where it was said. */
export function TaskRow({ task, from, showOwner = true, onOpen }: { task: TaskSummary; from?: string; showOwner?: boolean; onOpen?: () => void }) {
  const dropped = task.status === 'not_accepted' || task.status === 'cancelled';
  const facts =
    task.status === 'open_question'
      ? ['open question']
      : dropped
        ? [task.status === 'cancelled' ? 'cancelled' : 'proposed, never accepted']
        : [...(showOwner ? [task.owner ?? 'No owner named'] : []), task.deadline ?? 'no deadline'];
  const body = (
    <>
      <span className={cn('mt-0.5 inline-flex size-6 shrink-0 items-center justify-center border-2', MARK[task.status].className)}>
        <Icon name={MARK[task.status].icon} size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-body font-semibold text-text', dropped && 'text-muted', task.status === 'cancelled' && 'line-through')}>{task.title}</span>
        <span className="mt-0.5 block text-caption text-muted">
          {facts.map((f, i) => (
            <span key={f} className={cn(f === 'No owner named' && 'text-missing')}>
              {i > 0 && ' · '}
              {f}
            </span>
          ))}
          {from && <span> · {from}, {clock(task.at)}</span>}
        </span>
      </span>
    </>
  );
  return (
    <li className="border-b-2 border-border last:border-b-0">
      {onOpen ? (
        <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 py-3 text-left hover:bg-surface-muted">
          {body}
          <Icon name="open" size={16} className="mt-1 text-subtle" />
        </button>
      ) : (
        <div className="flex items-start gap-3 py-3">{body}</div>
      )}
    </li>
  );
}
