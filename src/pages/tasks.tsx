import { useEffect, useState } from 'react';
import type { Result } from '../../worker/types';
import {
  BoardColumn,
  CallList,
  COLUMNS,
  EditTaskDialog,
  FilterChips,
  NameVoiceDialog,
  TaskCard,
  columnOf,
  withEdit,
  type BoardTask,
  type ColumnKey,
} from '@/components/domain/board';
import { TaskRow } from '@/components/domain/history';
import { Page } from '@/components/domain/layout';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useQuotePlayer } from '@/lib/audio/quotes';
import { applyEdits } from '@/lib/clarify';
import { clock, plural } from '@/lib/format';
import { confirmTask, editTask, isExpired, nameVoice, rememberRun, setDone, useHistory, type HistoryEntry } from '@/lib/history';

// Soonest calendar date first, then deadlines whose date is unknown, then tasks without one.
const byDeadline = (a: BoardTask, b: BoardTask) => {
  const rank = (t: BoardTask) => (t.due ? 0 : t.deadline ? 1 : 2);
  return rank(a) - rank(b) || (a.due ?? '').localeCompare(b.due ?? '') || b.createdAt.localeCompare(a.createdAt) || a.at - b.at;
};
const byRecent = (a: BoardTask, b: BoardTask) => b.createdAt.localeCompare(a.createdAt) || a.at - b.at;

// Unnamed voices are only the same person within one recording.
const personOf = (t: BoardTask) => (!t.owner ? '' : /^Speaker \d+$/.test(t.owner) ? `${t.owner} · ${t.from}` : t.owner);

const callDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Recordings saved before the board existed lack its fields: their summaries are refreshed once from the stored results. */
function useRefreshOldEntries(entries: HistoryEntry[]) {
  const stale = entries.filter((e) => e.items.some((t) => !t.quote || !('deadlineRaw' in t)));
  const key = stale.map((e) => e.id).join(',');
  useEffect(() => {
    let cancelled = false;
    for (const entry of stale) {
      fetch(`/api/runs/${entry.id}`)
        .then((res) => (res.ok ? (res.json() as Promise<Result>) : null))
        .then((result) => {
          if (!cancelled && result) rememberRun(applyEdits(result, entry.edits), entry.fileName);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
    // The list changes on every save; only a new stale id needs a fetch.
  }, [key]);
}

/**
 * Which calls are on the board. All of them by default; /tasks?calls=a,b opens the board with only those,
 * and the address follows the choice, so it can be shared or bookmarked.
 */
function useHiddenCalls(entries: HistoryEntry[]) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => {
    const only = new URLSearchParams(window.location.search).get('calls');
    if (!only) return new Set();
    const keep = new Set(only.split(','));
    return new Set(entries.filter((e) => !keep.has(e.id)).map((e) => e.id));
  });
  const key = [...hidden].sort().join(',');
  useEffect(() => {
    const url = new URL(window.location.href);
    const shown = entries.filter((e) => !hidden.has(e.id)).map((e) => e.id);
    if (hidden.size && shown.length) url.searchParams.set('calls', shown.join(','));
    else url.searchParams.delete('calls');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    // Only the choice matters, not every new copy of the list.
  }, [key]);
  return {
    hidden,
    toggle: (id: string) =>
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    only: (id: string) => setHidden(new Set(entries.filter((e) => e.id !== id).map((e) => e.id))),
    all: () => setHidden(new Set()),
  };
}

/** Every task from the recordings analysed in this browser, laid out like a task board. */
export function TasksPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const entries = useHistory().filter((e) => !isExpired(e) && e.outcome !== 'decline');
  const [person, setPerson] = useState('all');
  const [editing, setEditing] = useState<{ key: string; focus?: 'owner' } | null>(null);
  const [naming, setNaming] = useState<string | null>(null);
  const calls = useHiddenCalls(entries);
  const { playing, play } = useQuotePlayer();
  useRefreshOldEntries(entries);

  const tasks: BoardTask[] = entries.flatMap((e) =>
    e.items.map((t) => withEdit({ ...t, runId: e.id, from: e.fileName, createdAt: e.createdAt, done: !!e.edits.done?.[t.id] }, e.edits.tasks?.[t.id])),
  );
  const keyOf = (t: BoardTask) => `${t.runId}:${t.id}`;
  const byKey = (key: string | null) => tasks.find((t) => keyOf(t) === key) ?? null;
  const playQuote = (t: BoardTask) => (t.quote ? () => play(keyOf(t), `/api/runs/${t.runId}/audio`, t.quote!.start, t.quote!.end) : undefined);
  // Owners to suggest when assigning: everyone named on the board.
  const names = [...new Set(tasks.map((t) => t.owner).filter((o): o is string => !!o && !/^Speaker \d+$/.test(o)))].sort();
  const shownCalls = entries.filter((e) => !calls.hidden.has(e.id));
  const inCalls = tasks.filter((t) => !calls.hidden.has(t.runId));
  const isOpen = (t: BoardTask) => columnOf(t) === 'todo' || columnOf(t) === 'check';

  // People with tasks on the board, the busiest first; "No owner named" last.
  const owned = inCalls.filter((t) => ['check', 'todo', 'done'].includes(columnOf(t)));
  const open = (key: string) => owned.filter((t) => personOf(t) === key && isOpen(t)).length;
  const people = [...new Set(owned.map(personOf))].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : open(b) - open(a) || a.localeCompare(b)));
  const selected = person === 'all' || people.includes(person) ? person : 'all';

  // Questions belong to everyone, so the person filter leaves them alone.
  const column = (key: ColumnKey) =>
    inCalls.filter((t) => columnOf(t) === key && (key === 'questions' || selected === 'all' || personOf(t) === selected)).sort(key === 'todo' ? byDeadline : byRecent);
  const columns = COLUMNS.map((c) => ({ ...c, tasks: column(c.key) }));
  const count = (key: ColumnKey) => columns.find((c) => c.key === key)!.tasks.length;
  const notCounted = inCalls.filter((t) => columnOf(t) === 'not_counted').sort(byRecent);

  const card = (t: BoardTask) => {
    const key = keyOf(t);
    const where = columnOf(t);
    return (
      <TaskCard
        key={key}
        task={t}
        playing={playing === key}
        onPlay={playQuote(t)}
        onOpen={() => onNavigate(`/r/${t.runId}#${t.id}`)}
        onToggleDone={where === 'check' ? undefined : () => setDone(t.runId, t.id, !t.done)}
        onConfirm={where === 'check' ? () => confirmTask(t.runId, t.id) : undefined}
        onEdit={(focus) => setEditing({ key, focus })}
        onName={() => setNaming(key)}
      />
    );
  };
  const edited = byKey(editing?.key ?? null);
  const unnamed = byKey(naming);

  return (
    <Page className="max-w-[1600px]">
      <h1 className="heading text-title-1 text-text">Tasks</h1>
      {entries.length > 0 && (
        <p className="mt-2 text-body text-muted">
          {plural(count('todo'), 'task')} to do · {count('check')} to check · {plural(count('questions'), 'open question')} · {count('done')} done, from{' '}
          {shownCalls.length === entries.length ? plural(entries.length, 'call') : `${shownCalls.length} of ${plural(entries.length, 'call')}`}. Open a task
          to see it in its call, or press ▶ to hear the words it comes from.
        </p>
      )}

      {entries.length ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="min-w-0">
            <CallList
              calls={entries.map((e) => ({
                id: e.id,
                name: e.fileName,
                meta: `${callDate(e.createdAt)} · ${clock(e.durationSec)}`,
                open: tasks.filter((t) => t.runId === e.id && isOpen(t)).length,
              }))}
              hidden={calls.hidden}
              onToggle={calls.toggle}
              onOnly={calls.only}
              onAll={calls.all}
            />
          </aside>

          <div className="@container min-w-0">
            {shownCalls.length ? (
              <>
                <FilterChips
                  label="Who"
                  value={selected}
                  onChange={setPerson}
                  options={[{ value: 'all', label: 'Everyone' }, ...people.map((p) => ({ value: p, label: p || 'No owner named', count: open(p) }))]}
                />
                <div className="mt-8 grid gap-x-5 gap-y-10 @2xl:grid-cols-2 @5xl:grid-cols-4">
                  {columns.map((c) => (
                    <BoardColumn key={c.key} title={c.title} hint={c.hint} empty={c.empty} bar={c.bar} count={c.tasks.length}>
                      {c.tasks.map(card)}
                    </BoardColumn>
                  ))}
                </div>
                {notCounted.length > 0 && (
                  <details className="group mt-12 border-2 border-border-strong bg-surface">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                      <span>
                        <span className="heading text-title-3 text-text">Not counted</span>{' '}
                        <span className="numeral text-title-3 text-subtle">{notCounted.length}</span>
                        <span className="mt-1 block text-caption text-muted">Proposals nobody accepted and tasks that were called off, so you can see what was dropped.</span>
                      </span>
                      <Icon name="expand" size={20} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                    </summary>
                    <ul className="border-t-2 border-border px-4">
                      {notCounted.map((t) => (
                        <TaskRow key={`${t.runId}:${t.id}`} task={t} from={t.from} onOpen={() => onNavigate(`/r/${t.runId}#${t.id}`)} />
                      ))}
                    </ul>
                  </details>
                )}
              </>
            ) : (
              <div className="border-2 border-dashed border-border-strong p-6">
                <p className="text-body text-muted">No calls are selected, so the board is empty.</p>
                <Button variant="secondary" className="mt-4" onClick={calls.all}>
                  Show all calls
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 border-2 border-dashed border-border-strong p-6">
          <p className="text-body text-muted">No tasks yet. They appear here after you analyse a recording.</p>
          <Button variant="primary" icon="upload" className="mt-4" onClick={() => onNavigate('/')}>
            Analyse a recording
          </Button>
        </div>
      )}
      {edited && (
        <EditTaskDialog
          key={editing!.key}
          task={edited}
          people={names}
          focus={editing!.focus}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          onSave={(change) => editTask(edited.runId, edited.id, change)}
        />
      )}
      {unnamed?.ownerSpeaker && (
        <NameVoiceDialog
          key={naming!}
          task={unnamed}
          open
          onOpenChange={(open) => !open && setNaming(null)}
          onSave={(name) => nameVoice(unnamed.runId, unnamed.ownerSpeaker!, name)}
          playing={playing === naming}
          onPlay={playQuote(unnamed)}
        />
      )}
    </Page>
  );
}
