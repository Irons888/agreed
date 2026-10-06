import { useState, type ReactNode } from 'react';
import type { TaskEdit, TaskSummary } from '@/lib/history';
import { calendarDate, clock, spoken } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button, IconButton } from '../ui/button';
import { FormDialog } from '../ui/dialog';
import { Icon } from '../ui/icon';
import { inputStyle } from './clarify';
import { Equalizer } from './timestamp';

/** A task on the board: the item from the history plus the recording it came from and whether it is ticked off. */
export type BoardTask = TaskSummary & {
  runId: string;
  from: string;
  createdAt: string;
  done: boolean;
  /** Changed on the board; `source` keeps the version the call supports. */
  edited?: boolean;
  source?: TaskSummary;
  edit?: TaskEdit;
};

const deadlineLabel = (text: string | null, due: string | null) => (due ? (text ? `${calendarDate(due)}, ${text}` : calendarDate(due)) : text);

/** The board's version of a task: the call's version with the user's changes on top. */
export function withEdit(task: BoardTask, edit: TaskEdit | undefined): BoardTask {
  if (!edit) return task;
  const redated = 'deadline' in edit || 'due' in edit;
  return {
    ...task,
    title: edit.title ?? task.title,
    owner: 'owner' in edit ? (edit.owner ?? null) : task.owner,
    ...(redated ? { deadline: deadlineLabel(edit.deadline ?? null, edit.due ?? null), due: edit.due ?? null, dateUnknown: false } : {}),
    edited: true,
    source: task,
    edit,
  };
}

/** An owner that is only a voice number, which the user can name. */
export const unnamedVoice = (task: BoardTask) => !!task.ownerSpeaker && !task.edit?.owner && /^Speaker \d+$/.test(task.owner ?? '');

export type ColumnKey = 'check' | 'todo' | 'questions' | 'done';

/** Like a task board: what needs a decision, what to do, what nobody knows yet, what is finished. */
export const COLUMNS: { key: ColumnKey; title: string; hint: string; empty: string; bar: string }[] = [
  { key: 'check', title: 'To check', hint: 'Said with a hedge. Count it as agreed, or leave it here.', empty: 'Nothing to check.', bar: 'bg-review-bg' },
  { key: 'todo', title: 'To do', hint: 'Agreed. Soonest deadline first.', empty: 'No open tasks.', bar: 'bg-agreed-bg' },
  { key: 'questions', title: 'Open questions', hint: 'Nobody had the answer on the call.', empty: 'No open questions.', bar: 'bg-question-bg' },
  { key: 'done', title: 'Done', hint: 'Ticked off here.', empty: 'Tick a task when it is done.', bar: 'bg-ink' },
];

/** Where a task sits. Proposals nobody accepted and cancelled tasks are not on the board. */
export function columnOf(task: BoardTask): ColumnKey | 'not_counted' {
  if (task.status === 'not_accepted' || task.status === 'cancelled') return 'not_counted';
  if (task.done) return 'done';
  if (task.status === 'needs_review') return 'check';
  if (task.status === 'open_question') return 'questions';
  return 'todo';
}

const localToday = () => new Date().toLocaleDateString('en-CA');

const chipAction = 'font-semibold text-text underline underline-offset-2 hover:no-underline';

function OwnerChip({ owner, onAssign, onName }: { owner: string | null; onAssign?: () => void; onName?: () => void }) {
  if (!owner) {
    return (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1 font-semibold text-missing">
          <Icon name="noOwner" size={14} />
          No owner named
        </span>
        {onAssign && (
          <button type="button" onClick={onAssign} className={chipAction}>
            Assign
          </button>
        )}
      </span>
    );
  }
  const unnamed = /^Speaker (\d+)$/.exec(owner);
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-text">
      <span aria-hidden className="inline-flex size-5 shrink-0 items-center justify-center bg-ink font-mono text-tag font-bold text-ink-contrast">
        {unnamed ? unnamed[1] : owner.trim()[0]?.toUpperCase()}
      </span>
      <span className="truncate">{owner}</span>
      {onName && (
        <button type="button" onClick={onName} className={cn(chipAction, 'ml-1')}>
          Name
        </button>
      )}
    </span>
  );
}

function DueChip({ task }: { task: BoardTask }) {
  if (!task.deadline) {
    return (
      <span className="inline-flex items-center gap-1 text-muted">
        <Icon name="noDate" size={14} />
        No deadline
      </span>
    );
  }
  const today = localToday();
  const overdue = !task.done && !!task.due && task.due < today;
  const dueToday = !task.done && task.due === today;
  return (
    <span className={cn('inline-flex items-start gap-1', overdue ? 'font-semibold text-danger' : dueToday ? 'font-semibold text-missing' : 'text-text')}>
      <Icon name="deadline" size={14} className="mt-0.5 shrink-0" />
      <span>
        {overdue && 'Overdue · '}
        {dueToday && 'Today · '}
        {task.deadline}
        {task.dateUnknown && <span className="font-semibold text-missing"> · date unknown</span>}
      </span>
    </span>
  );
}

/** ▶ 0:41 on a card: plays the words the task comes from. */
function QuoteButton({ start, active, onClick }: { start: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${active ? 'Pause' : 'Play'} the quote at ${clock(start)}`}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 border-2 px-2 font-mono text-caption font-medium tabular transition-colors',
        active ? 'border-ink bg-ink text-ink-accent' : 'border-border-strong text-text hover:border-ink hover:bg-accent hover:text-on-accent',
      )}
    >
      {active ? <Equalizer /> : <Icon name="play" size={14} />}
      {clock(start)}
    </button>
  );
}

function DoneBox({ done, label, onClick }: { done: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center border-2 transition-colors',
        done ? 'border-ink bg-accent text-on-accent' : 'border-border-strong text-transparent hover:bg-surface-muted hover:text-subtle',
      )}
    >
      <Icon name="check" size={14} />
    </button>
  );
}

/** One task: what, who, by when, the words it rests on with ▶, and where it was said. */
export function TaskCard({
  task,
  playing = false,
  onPlay,
  onOpen,
  onToggleDone,
  onConfirm,
  onEdit,
  onName,
}: {
  task: BoardTask;
  playing?: boolean;
  onPlay?: () => void;
  onOpen: () => void;
  onToggleDone?: () => void;
  onConfirm?: () => void;
  /** Opens the edit form; "owner" starts in the owner field. */
  onEdit?: (focus?: 'owner') => void;
  /** Names the voice that owns the task. */
  onName?: () => void;
}) {
  const question = task.status === 'open_question';
  return (
    <li className={cn('border-2 bg-surface p-4', task.status === 'needs_review' && !task.done ? 'border-review-border' : 'border-border-strong')}>
      <div className="flex items-start gap-3">
        {onToggleDone && (
          <DoneBox
            done={task.done}
            onClick={onToggleDone}
            label={question ? (task.done ? 'Mark as not answered' : 'Mark as answered') : task.done ? 'Mark as not done' : 'Mark as done'}
          />
        )}
        <div className="min-w-0 flex-1">
          <a
            href={`/r/${task.runId}#${task.id}`}
            onClick={(e) => {
              e.preventDefault();
              onOpen();
            }}
            className={cn('block text-body font-semibold text-text hover:underline', task.done && 'text-muted line-through')}
          >
            {task.title}
          </a>
          {!question && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
              <OwnerChip owner={task.owner} onAssign={onEdit && !task.done ? () => onEdit('owner') : undefined} onName={unnamedVoice(task) ? onName : undefined} />
              <DueChip task={task} />
            </div>
          )}
          {task.edited && task.source && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-caption text-muted" title={`In the call: ${[task.source.title, task.source.owner ?? 'no owner', task.source.deadline ?? 'no deadline'].join(' · ')}`}>
              <Icon name="edit" size={14} />
              Edited by you
            </p>
          )}
        </div>
        {onEdit && <IconButton icon="edit" label="Edit the task" size="sm" className="-mr-2 -mt-2" onClick={() => onEdit()} />}
      </div>
      {task.quote && <blockquote className="mt-3 line-clamp-2 border-l-4 border-border pl-3 text-caption text-muted">{spoken(task.quote.text)}</blockquote>}
      <div className="mt-3 flex items-center gap-3 text-caption text-muted">
        {task.quote && onPlay && <QuoteButton start={task.quote.start} active={playing} onClick={onPlay} />}
        <span className="min-w-0 truncate" title={task.from}>
          {task.from}
        </span>
      </div>
      {onConfirm && (
        <div className="mt-3 border-t-2 border-border pt-3">
          <Button size="sm" variant="primary" icon="agreed" onClick={onConfirm}>
            Count as agreed
          </Button>
        </div>
      )}
    </li>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-label font-semibold text-text">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-caption text-muted">{hint}</span>}
    </label>
  );
}

/**
 * The board's own version of a task. It never changes what the call supports: the call page keeps the
 * verified item, and "Back to the call's version" drops the changes.
 */
export function EditTaskDialog({
  task,
  people,
  focus,
  open,
  onOpenChange,
  onSave,
}: {
  task: BoardTask;
  /** Names to suggest for the owner. */
  people: string[];
  focus?: 'owner';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (edit: TaskEdit | null) => void;
}) {
  const source = task.source ?? task;
  const edit = task.edit;
  const question = task.status === 'open_question';
  const [title, setTitle] = useState(task.title);
  const [owner, setOwner] = useState(task.owner ?? '');
  const [deadline, setDeadline] = useState(edit && 'deadline' in edit ? (edit.deadline ?? '') : (source.deadlineRaw ?? ''));
  const [due, setDue] = useState(edit && 'due' in edit ? (edit.due ?? '') : (source.due ?? ''));

  const save = () => {
    const next: TaskEdit = {};
    const t = title.trim();
    if (t && t !== source.title) next.title = t;
    if (!question) {
      const o = owner.trim() || null;
      if (o !== source.owner) next.owner = o;
      const d = deadline.trim() || null;
      const iso = due || null;
      if (d !== (source.deadlineRaw ?? null) || iso !== (source.due ?? null)) {
        next.deadline = d;
        next.due = iso;
      }
    }
    onSave(Object.keys(next).length ? next : null);
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={question ? 'Edit the question' : 'Edit the task'}
      description={
        <>
          From <span className="font-semibold text-text">{task.from}</span>. Changes stay on this board; the call keeps what was said.
        </>
      }
      submitLabel="Save"
      onSubmit={save}
      extra={
        task.edited ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onSave(null);
              onOpenChange(false);
            }}
          >
            Back to the call's version
          </Button>
        ) : undefined
      }
    >
      <Field label={question ? 'Question' : 'Task'}>
        <input className={cn(inputStyle, 'mt-1 w-full')} value={title} required maxLength={160} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      {!question && (
        <>
          <Field label="Owner" hint="Leave it empty if nobody took the task.">
            <input
              className={cn(inputStyle, 'mt-1 w-full')}
              list="board-people"
              value={owner}
              placeholder="No owner"
              autoFocus={focus === 'owner'}
              onChange={(e) => setOwner(e.target.value)}
            />
            <datalist id="board-people">
              {people.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Deadline" hint="Words, such as “by Friday”.">
              <input className={cn(inputStyle, 'mt-1 w-full')} value={deadline} placeholder="No deadline" onChange={(e) => setDeadline(e.target.value)} />
            </Field>
            <Field label="Date" hint="Exact day, for sorting and overdue marks.">
              <input type="date" className={cn(inputStyle, 'mt-1 w-full')} value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
          </div>
        </>
      )}
      {task.quote && (
        <p className="border-l-4 border-border pl-3 text-caption text-muted">
          Said in the call: {spoken(task.quote.text)}
        </p>
      )}
    </FormDialog>
  );
}

/** Nobody said their name: name the voice once, for every task it took in that call and for the call page. */
export function NameVoiceDialog({
  task,
  open,
  onOpenChange,
  onSave,
  playing,
  onPlay,
}: {
  task: BoardTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
  playing?: boolean;
  onPlay?: () => void;
}) {
  const [name, setName] = useState('');
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Who is ${task.owner}?`}
      description={
        <>
          Nobody said their name in <span className="font-semibold text-text">{task.from}</span>. The name goes on every task of this voice in that call, and
          on the call page.
        </>
      }
      submitLabel="Save the name"
      onSubmit={() => {
        if (!name.trim()) return;
        onSave(name.trim());
        onOpenChange(false);
      }}
    >
      {task.quote && (
        <div className="flex items-start gap-3 border-l-4 border-border pl-3 text-caption text-muted">
          {onPlay && <QuoteButton start={task.quote.start} active={!!playing} onClick={onPlay} />}
          <span>{spoken(task.quote.text)}</span>
        </div>
      )}
      <Field label="Name">
        <input className={cn(inputStyle, 'mt-1 w-full')} value={name} required autoFocus placeholder="For example, Tom" onChange={(e) => setName(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

/** A board column: a coloured bar, the title and count, one line on what belongs here, then the cards. */
export function BoardColumn({ title, hint, empty, bar, count, children }: { title: string; hint: string; empty: string; bar: string; count: number; children?: ReactNode }) {
  return (
    <section aria-label={title} className="min-w-0">
      <span aria-hidden className={cn('block h-1.5', bar)} />
      <header className="mt-3 flex items-baseline justify-between gap-3">
        <h2 className="heading text-title-3 text-text">{title}</h2>
        <span className="numeral text-title-3 text-subtle">{count}</span>
      </header>
      <p className="mt-1 text-caption text-muted">{hint}</p>
      {count ? <ul className="mt-4 space-y-3">{children}</ul> : <p className="mt-4 border-2 border-dashed border-border p-4 text-caption text-subtle">{empty}</p>}
    </section>
  );
}

/** Quick filters, like the assignee chips of a task board. */
export function FilterChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-caption text-muted">{label}</span>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 border-2 px-3 text-label font-semibold transition-colors',
              on ? 'border-ink bg-ink text-ink-contrast' : 'border-border-strong text-text hover:bg-surface-muted',
            )}
          >
            {option.label}
            {option.count != null && <span className={cn('font-mono text-caption', on ? 'text-ink-accent' : 'text-subtle')}>{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export type CallOption = { id: string; name: string; meta: string; open: number };

/**
 * The calls whose tasks are on the board, like the calendar list of a calendar app:
 * all are shown at first, untick one to hide its tasks, "only" keeps just that call.
 */
export function CallList({
  calls,
  hidden,
  onToggle,
  onOnly,
  onAll,
}: {
  calls: CallOption[];
  hidden: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onOnly: (id: string) => void;
  onAll: () => void;
}) {
  const shown = calls.filter((c) => !hidden.has(c.id)).length;
  return (
    <section aria-label="Calls on the board">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="heading text-title-3 text-text">Calls</h2>
        <span className="text-caption text-muted">{shown === calls.length ? `all ${calls.length}` : `${shown} of ${calls.length}`}</span>
      </header>
      <ul className="mt-3 max-h-[70vh] overflow-y-auto border-2 border-border-strong bg-surface">
        {calls.map((call) => {
          const on = !hidden.has(call.id);
          return (
            <li key={call.id} className="group flex items-start gap-2 border-b-2 border-border p-3 last:border-b-0">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={`${call.name}, ${call.meta}, ${call.open} open`}
                onClick={() => onToggle(call.id)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center border-2 transition-colors',
                    on ? 'border-ink bg-ink text-ink-accent' : 'border-border-strong text-transparent group-hover:text-subtle',
                  )}
                >
                  <Icon name="check" size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-label font-semibold', on ? 'text-text' : 'text-muted')} title={call.name}>
                    {call.name}
                  </span>
                  <span className="block text-caption text-muted">
                    {call.meta} · {call.open} open
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onOnly(call.id)}
                aria-label={`Show only ${call.name}`}
                className="shrink-0 text-caption font-semibold text-muted underline-offset-2 hover:text-text hover:underline focus:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
              >
                only
              </button>
            </li>
          );
        })}
      </ul>
      {shown < calls.length && (
        <button type="button" onClick={onAll} className="mt-2 text-caption font-semibold text-text underline underline-offset-2 hover:no-underline">
          Show all calls
        </button>
      )}
    </section>
  );
}
