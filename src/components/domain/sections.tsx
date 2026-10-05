import type { ReactNode } from 'react';
import type { Item, Speaker, Status } from '../../../worker/types';
import { cn } from '@/lib/cn';
import { CommitmentCard } from './commitment-card';

export const SECTIONS: { id: string; title: string; short: string; statuses: Status[]; note?: string; empty: string }[] = [
  { id: 'agreed', title: 'Agreed tasks', short: 'Agreed', statuses: ['agreed'], empty: 'No firm commitments in this recording.' },
  { id: 'questions', title: 'Open questions', short: 'Open questions', statuses: ['open_question'], empty: 'No unanswered questions.' },
  {
    id: 'review',
    title: 'Needs review',
    short: 'Needs review',
    statuses: ['needs_review'],
    note: 'Hedged or unclear agreements. They are not counted as agreed until you confirm them.',
    empty: 'Nothing unclear.',
  },
  {
    id: 'not-counted',
    title: 'Not counted, and why',
    short: 'Not counted',
    statuses: ['not_accepted', 'cancelled'],
    note: 'Proposals nobody accepted and tasks that were called off. Listed so you can see what was left out on purpose.',
    empty: 'Nothing was proposed and dropped.',
  },
];

/** Four big counters; each jumps to its section. */
export function CountersBar({ items }: { items: Item[] }) {
  return (
    <nav aria-label="Result sections" className="grid grid-cols-2 gap-0.5 border-2 border-border-strong bg-border-strong sm:grid-cols-4">
      {SECTIONS.map((section, i) => {
        const count = items.filter((item) => section.statuses.includes(item.status)).length;
        const lead = section.id === 'agreed' && count > 0;
        return (
          <a
            key={section.id}
            href={`#section-${section.id}`}
            className={cn(
              'flex flex-col justify-between gap-6 p-4 transition-colors',
              lead ? 'bg-accent text-on-accent' : 'bg-surface text-text hover:bg-surface-muted',
              count === 0 && 'text-subtle',
            )}
          >
            <span className="tag-label">
              {String(i + 1).padStart(2, '0')} · {section.short}
            </span>
            <span className="headline text-title-1 tabular">{count}</span>
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
    <div className="space-y-12">
      {SECTIONS.map((section) => {
        const list = items.filter((i) => section.statuses.includes(i.status));
        if (!list.length && section.id !== 'agreed') return null;
        return (
          <section key={section.id} id={`section-${section.id}`} aria-labelledby={`title-${section.id}`} className="scroll-mt-6">
            <div className="flex items-end justify-between gap-4 border-b-2 border-border-strong pb-3">
              <h2 id={`title-${section.id}`} className="headline text-title-2 text-text">
                {section.title}
              </h2>
              <span className="headline text-title-2 text-subtle tabular">{String(list.length).padStart(2, '0')}</span>
            </div>
            {section.note && <p className="mt-3 max-w-2xl text-body text-muted">{section.note}</p>}
            <div className="mt-5 space-y-4">
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
                <p className="border-2 border-dashed border-border-strong p-5 text-body text-muted">{section.empty}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
