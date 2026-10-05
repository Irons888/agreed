import type { ReactNode } from 'react';
import type { Status } from '../../worker/types';
import { TaskRow } from '@/components/domain/history';
import { Page } from '@/components/domain/layout';
import { Button } from '@/components/ui/button';
import { plural } from '@/lib/format';
import { isExpired, useHistory, type HistoryEntry, type TaskSummary } from '@/lib/history';

type Row = { task: TaskSummary; entry: HistoryEntry };

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <h2 className="heading text-title-2 text-text">
        {title} <span className="text-subtle">{count}</span>
      </h2>
      <ul className="mt-3 border-2 border-border-strong bg-surface px-4">{children}</ul>
    </section>
  );
}

/** Everything agreed across the recordings in the history, by person: who promised what. */
export function TasksPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const entries = useHistory().filter((e) => !isExpired(e) && e.outcome !== 'decline');
  const rows = entries.flatMap((entry) => entry.items.map((task) => ({ task, entry })));
  const pick = (status: Status) => rows.filter((r) => r.task.status === status);
  const agreed = pick('agreed');

  // Unnamed voices are only the same person within one recording.
  const ownerKey = (r: Row) => (!r.task.owner ? '' : /^Speaker \d+$/.test(r.task.owner) ? `${r.task.owner} in ${r.entry.fileName}` : r.task.owner);
  const people = [...new Set(agreed.map(ownerKey))].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)));

  const row = (r: Row, showOwner = true) => (
    <TaskRow
      key={`${r.entry.id}:${r.task.id}`}
      task={r.task}
      from={r.entry.fileName}
      showOwner={showOwner}
      onOpen={() => onNavigate(`/r/${r.entry.id}#${r.task.id}`)}
    />
  );

  return (
    <Page>
      <h1 className="heading text-title-1 text-text">Tasks</h1>
      <p className="mt-2 max-w-2xl text-body text-muted">
        Who promised what, across your recordings. Open a task to hear the words it comes from.
        {entries.length > 0 && ` ${plural(agreed.length, 'agreed task')} from ${plural(entries.length, 'recording')}.`}
      </p>

      {rows.length ? (
        <div className="mt-8 space-y-10">
          {people.map((person) => {
            const list = agreed.filter((r) => ownerKey(r) === person);
            return (
              <Group key={person || 'none'} title={person || 'No owner named'} count={list.length}>
                {list.map((r) => row(r, false))}
              </Group>
            );
          })}
          {pick('needs_review').length > 0 && (
            <Group title="Needs your check" count={pick('needs_review').length}>
              {pick('needs_review').map((r) => row(r))}
            </Group>
          )}
          {pick('open_question').length > 0 && (
            <Group title="Open questions" count={pick('open_question').length}>
              {pick('open_question').map((r) => row(r))}
            </Group>
          )}
        </div>
      ) : (
        <div className="mt-8 border-2 border-dashed border-border-strong p-6">
          <p className="text-body text-muted">No tasks yet. They appear here after you analyze a recording.</p>
          <Button variant="primary" icon="upload" className="mt-4" onClick={() => onNavigate('/')}>
            Analyze a recording
          </Button>
        </div>
      )}
    </Page>
  );
}
