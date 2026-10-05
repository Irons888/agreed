import { Collapsible } from 'radix-ui';
import { useState, type ReactNode } from 'react';
import type { Item, Speaker, Status } from '../../../worker/types';
import { Icon } from '../ui/icon';
import { CommitmentCard } from './commitment-card';

type Section = { id: string; title: string; statuses: Status[]; note?: string; empty?: string; collapsed?: boolean; showStatus?: boolean };

export const SECTIONS: Section[] = [
  { id: 'agreed', title: 'Agreed tasks', statuses: ['agreed'], empty: 'No firm commitments in this recording.' },
  {
    id: 'review',
    title: 'Needs your check',
    statuses: ['needs_review'],
    note: 'Hedged or unclear. Not counted as agreed until you confirm.',
  },
  { id: 'questions', title: 'Open questions', statuses: ['open_question'] },
  {
    id: 'not-counted',
    title: 'Not counted',
    statuses: ['not_accepted', 'cancelled'],
    note: 'Proposals nobody accepted and tasks that were called off.',
    collapsed: true,
    showStatus: true,
  },
];

const count = (items: Item[], statuses: Status[]) => items.filter((i) => statuses.includes(i.status)).length;

/** One line instead of a dashboard: "3 agreed tasks · 1 open question · 2 not counted". Each part jumps to its section. */
export function SummaryLine({ items }: { items: Item[] }) {
  const noun = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
  const parts = [
    { id: 'agreed', n: count(items, ['agreed']), text: (n: number) => noun(n, 'agreed task') },
    { id: 'review', n: count(items, ['needs_review']), text: () => 'to check' },
    { id: 'questions', n: count(items, ['open_question']), text: (n: number) => noun(n, 'open question') },
    { id: 'not-counted', n: count(items, ['not_accepted', 'cancelled']), text: () => 'not counted' },
  ].filter((p) => p.n > 0 || p.id === 'agreed');
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-lg text-muted">
      {parts.map((p, i) => (
        <span key={p.id} className="inline-flex items-center gap-2">
          <a href={`#section-${p.id}`} className="hover:text-text hover:underline">
            <span className="font-semibold text-text">{p.n}</span> {p.text(p.n)}
          </a>
          {i < parts.length - 1 && <span aria-hidden>·</span>}
        </span>
      ))}
    </p>
  );
}

function SectionCards({
  list,
  section,
  speakers,
  highlighted,
  onHighlight,
  onSetDate,
  actionsFor,
}: {
  list: Item[];
  section: Section;
  speakers: Speaker[];
  highlighted: string | null;
  onHighlight: (id: string | null) => void;
  onSetDate?: (iso: string) => void;
  actionsFor?: (item: Item) => ReactNode;
}) {
  return (
    <div className="mt-4 space-y-4">
      {list.length ? (
        list.map((item) => (
          <CommitmentCard
            key={item.id}
            item={item}
            speakers={speakers}
            highlighted={highlighted === item.id}
            onHighlight={onHighlight}
            showStatus={section.showStatus}
            onSetDate={onSetDate}
            actions={actionsFor?.(item)}
          />
        ))
      ) : (
        <p className="border-2 border-dashed border-border-strong p-5 text-body text-muted">{section.empty}</p>
      )}
    </div>
  );
}

/** Items grouped by final status. "Not counted" starts folded: it explains what was left out, it isn't the result. */
export function ItemSections({
  items,
  speakers,
  highlighted,
  onHighlight,
  onSetDate,
  actionsFor,
}: {
  items: Item[];
  speakers: Speaker[];
  highlighted: string | null;
  onHighlight: (id: string | null) => void;
  onSetDate?: (iso: string) => void;
  actionsFor?: (item: Item) => ReactNode;
}) {
  const [showDropped, setShowDropped] = useState(false);
  return (
    <div className="space-y-10">
      {SECTIONS.map((section) => {
        const list = items.filter((i) => section.statuses.includes(i.status));
        if (!list.length && !section.empty) return null;
        const cards = (
          <SectionCards
            list={list}
            section={section}
            speakers={speakers}
            highlighted={highlighted}
            onHighlight={onHighlight}
            onSetDate={onSetDate}
            actionsFor={actionsFor}
          />
        );
        if (section.collapsed) {
          return (
            <Collapsible.Root key={section.id} open={showDropped} onOpenChange={setShowDropped} asChild>
              <section id={`section-${section.id}`} aria-labelledby={`title-${section.id}`} className="scroll-mt-6">
                <Collapsible.Trigger className="group flex w-full items-center justify-between gap-4 border-2 border-border-strong bg-surface px-4 py-3 text-left hover:bg-surface-muted">
                  <span>
                    <span id={`title-${section.id}`} className="heading text-title-3 text-text">
                      {section.title} <span className="text-subtle">{list.length}</span>
                    </span>
                    <span className="mt-0.5 block text-caption text-muted">{section.note}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-caption font-semibold text-text">
                    {showDropped ? 'Hide' : 'Show'}
                    <Icon name="expand" size={14} className="transition-transform group-data-[state=open]:rotate-180" />
                  </span>
                </Collapsible.Trigger>
                <Collapsible.Content>{cards}</Collapsible.Content>
              </section>
            </Collapsible.Root>
          );
        }
        return (
          <section key={section.id} id={`section-${section.id}`} aria-labelledby={`title-${section.id}`} className="scroll-mt-6">
            <h2 id={`title-${section.id}`} className="heading text-title-2 text-text">
              {section.title} <span className="text-subtle">{list.length}</span>
            </h2>
            {section.note && <p className="mt-1 text-body text-muted">{section.note}</p>}
            {cards}
          </section>
        );
      })}
    </div>
  );
}
