import type { ReactNode } from 'react';
import type { Item, Speaker, Status } from '../../../worker/types';
import { cn } from '@/lib/cn';
import { CommitmentCard } from './commitment-card';
import { STATUS_META } from './status';

export const SECTIONS: { id: string; title: string; statuses: Status[]; note?: string; empty: string }[] = [
  { id: 'agreed', title: 'Agreed tasks', statuses: ['agreed'], empty: 'No firm commitments in this recording.' },
  { id: 'questions', title: 'Open questions', statuses: ['open_question'], empty: 'No unanswered questions.' },
  {
    id: 'review',
    title: 'Needs review',
    statuses: ['needs_review'],
    note: 'Hedged or unclear agreements. They are not counted as agreed until you confirm them.',
    empty: 'Nothing unclear.',
  },
  {
    id: 'not-counted',
    title: 'Not counted, and why',
    statuses: ['not_accepted', 'cancelled'],
    note: 'Proposals nobody accepted and tasks that were called off. Listed so you can see what was left out on purpose.',
    empty: 'Nothing was proposed and dropped.',
  },
];

export function CountersBar({ items }: { items: Item[] }) {
  return (
    <nav aria-label="Result sections" className="flex flex-wrap gap-2">
      {SECTIONS.map((section) => {
        const count = items.filter((i) => section.statuses.includes(i.status)).length;
        const meta = STATUS_META[section.statuses[0]];
        return (
          <a
            key={section.id}
            href={`#section-${section.id}`}
            className={cn(
              'inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 text-label text-muted hover:bg-surface-muted',
              count === 0 && 'opacity-60',
            )}
          >
            <span className={cn('size-2 rounded-full', meta.dot)} />
            <span className="font-semibold text-text tabular">{count}</span>
            {section.title}
          </a>
        );
      })}
    </nav>
  );
}

export function ItemSections({
  items,
  speakers,
  highlighted,
  onHighlight,
  actionsFor,
}: {
  items: Item[];
  speakers: Speaker[];
  highlighted: string | null;
  onHighlight: (id: string | null) => void;
  actionsFor?: (item: Item) => ReactNode;
}) {
  return (
    <div className="space-y-8">
      {SECTIONS.map((section) => {
        const list = items.filter((i) => section.statuses.includes(i.status));
        if (!list.length && section.id !== 'agreed') return null;
        return (
          <section key={section.id} id={`section-${section.id}`} aria-labelledby={`title-${section.id}`} className="scroll-mt-6">
            <h2 id={`title-${section.id}`} className="flex items-baseline gap-2 text-title-2 font-semibold text-text">
              {section.title}
              <span className="text-body font-normal text-subtle tabular">{list.length}</span>
            </h2>
            {section.note && <p className="mt-1 text-body text-muted">{section.note}</p>}
            <div className="mt-3 space-y-3">
              {list.length ? (
                list.map((item) => (
                  <CommitmentCard
                    key={item.id}
                    item={item}
                    speakers={speakers}
                    highlighted={highlighted === item.id}
                    onHighlight={onHighlight}
                    actions={actionsFor?.(item)}
                  />
                ))
              ) : (
                <p className="rounded-card border border-dashed border-border-strong p-4 text-body text-muted">{section.empty}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
