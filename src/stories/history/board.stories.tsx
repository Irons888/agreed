import type { Meta, StoryObj } from '@storybook/react-vite';
import { BoardColumn, CallList, COLUMNS, EditTaskDialog, FilterChips, NameVoiceDialog, TaskCard, withEdit, type BoardTask } from '@/components/domain/board';

const meta = { title: 'History/Board', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const today = new Date();
const iso = (days: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + days).toLocaleDateString('en-CA');
const label = (days: number, said: string) =>
  `${new Date(today.getFullYear(), today.getMonth(), today.getDate() + days).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, “${said}”`;

const task = (over: Partial<BoardTask>): BoardTask => ({
  id: 't1',
  title: 'Send API documentation',
  status: 'agreed',
  owner: 'Mark',
  deadline: '“by Wednesday”',
  dateUnknown: true,
  due: null,
  at: 16.3,
  quote: { text: "Yes, I'll send the API docs by Wednesday.", start: 16.3, end: 18.4 },
  runId: 'r1',
  from: 'T1-main.wav',
  createdAt: today.toISOString(),
  done: false,
  ...over,
});

const noop = () => {};
const Card = (props: Partial<Parameters<typeof TaskCard>[0]> & { task: BoardTask }) => (
  <ul className="w-80">
    <TaskCard onOpen={noop} onPlay={noop} {...props} />
  </ul>
);

/** Agreed, said as a weekday in a call with no known date. */
export const DateUnknown: Story = { render: () => <Card task={task({})} onToggleDone={noop} /> };

/** The call stated its date, so the deadline is on the calendar. */
export const OnTheCalendar: Story = {
  render: () => <Card task={task({ title: 'Run the QA pass', owner: 'Anna', deadline: label(3, 'by Friday'), due: iso(3), dateUnknown: false })} onToggleDone={noop} />,
};

export const DueToday: Story = {
  render: () => <Card task={task({ title: 'Deploy the fix', deadline: label(0, 'tomorrow morning'), due: iso(0), dateUnknown: false })} onToggleDone={noop} />,
};

export const Overdue: Story = {
  render: () => <Card task={task({ title: 'Email the support team', owner: 'Anna', deadline: label(-1, 'today'), due: iso(-1), dateUnknown: false })} onToggleDone={noop} />,
};

/** Nobody took it: "Assign" opens the edit form at the owner. */
export const NoOwner: Story = {
  render: () => (
    <Card
      task={task({ title: 'Update the privacy policy page', owner: null, deadline: '“before launch”', dateUnknown: false, quote: { text: 'Yes, that definitely needs to happen.', start: 42, end: 43.8 } })}
      onToggleDone={noop}
      onEdit={noop}
    />
  ),
};

/** The owner is a voice nobody named: "Name" names it for the whole call. */
export const UnnamedVoice: Story = {
  render: () => <Card task={task({ title: 'Fix the export bug', owner: 'Speaker 2', ownerSpeaker: 'S2', deadline: '“by Friday”' })} onToggleDone={noop} onEdit={noop} onName={noop} />,
};

/** Changed on the board: the title, owner and date are the user's; the quote still shows what was said. */
export const Edited: Story = {
  render: () => (
    <Card
      task={withEdit(task({ deadlineRaw: 'by Wednesday' }), { title: 'Send the API docs to the partner team', deadline: 'by Wednesday', due: iso(1) })}
      onToggleDone={noop}
      onEdit={noop}
    />
  ),
};

export const MovedDeadline: Story = {
  render: () => <Card task={task({ title: 'Prepare the staging demo', deadline: '“Monday”, moved from “Thursday”', quote: { text: "Okay, let's make it Monday.", start: 57.3, end: 58.5 } })} onToggleDone={noop} />,
};

/** Hedged when it was said: it waits for a decision and cannot be ticked off yet. */
export const ToCheck: Story = {
  render: () => (
    <Card
      task={task({ title: 'Fix the export bug', status: 'needs_review', owner: 'Speaker 2', deadline: '“by Friday”', quote: { text: "I'll try to get a fix in by Friday, but no promises.", start: 2.1, end: 5.4 } })}
      onConfirm={noop}
    />
  ),
};

export const OpenQuestion: Story = {
  render: () => (
    <Card
      task={task({ title: 'Does the client need single sign-on?', status: 'open_question', owner: null, deadline: null, quote: { text: 'Oh, and do we know if the client needs single sign-on?', start: 44.1, end: 46.9 } })}
      onToggleDone={noop}
    />
  ),
};

export const Done: Story = { render: () => <Card task={task({ done: true })} onToggleDone={noop} /> };

export const Playing: Story = { render: () => <Card task={task({})} playing onToggleDone={noop} /> };

/** Saved before the board existed: no quote yet, so no ▶ until the summary is refreshed. */
export const WithoutQuote: Story = { render: () => <Card task={task({ quote: undefined })} onToggleDone={noop} /> };

export const Columns: Story = {
  render: () => (
    <div className="grid max-w-[1400px] gap-6 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map(({ key, ...c }) => (
        <BoardColumn key={key} {...c} count={key === 'todo' ? 2 : 0}>
          {key === 'todo' && (
            <>
              <TaskCard task={task({ title: 'Deploy the fix', deadline: label(0, 'tomorrow morning'), due: iso(0), dateUnknown: false })} onOpen={noop} onPlay={noop} onToggleDone={noop} />
              <TaskCard task={task({ id: 't2' })} onOpen={noop} onPlay={noop} onToggleDone={noop} />
            </>
          )}
        </BoardColumn>
      ))}
    </div>
  ),
};

export const EditDialog: Story = {
  render: () => (
    <EditTaskDialog task={task({ deadlineRaw: 'by Wednesday' })} people={['Anna', 'Mark', 'Tom']} open onOpenChange={noop} onSave={noop} />
  ),
};

export const EditDialogForEditedTask: Story = {
  render: () => (
    <EditTaskDialog
      task={withEdit(task({ deadlineRaw: 'by Wednesday' }), { owner: 'Anna', due: iso(2), deadline: 'by Wednesday' })}
      people={['Anna', 'Mark', 'Tom']}
      open
      onOpenChange={noop}
      onSave={noop}
    />
  ),
};

export const NameVoice: Story = {
  render: () => (
    <NameVoiceDialog
      task={task({ title: 'Fix the export bug', owner: 'Speaker 2', ownerSpeaker: 'S2', from: 'T3-ambiguous.wav', quote: { text: "I'll try to get a fix in by Friday, but no promises.", start: 2.1, end: 5.4 } })}
      open
      onOpenChange={noop}
      onSave={noop}
      onPlay={noop}
    />
  ),
};

/** Which calls are on the board: all by default, one unticked here. */
export const Calls: Story = {
  render: () => (
    <div className="w-60">
      <CallList
        calls={[
          { id: 'a', name: 'Partner portal sync.m4a', meta: '6 Oct · 2:41', open: 4 },
          { id: 'b', name: 'T4-dated.wav', meta: '5 Oct · 0:37', open: 3 },
          { id: 'c', name: 'T3-ambiguous.wav', meta: '5 Oct · 0:39', open: 1 },
        ]}
        hidden={new Set(['c'])}
        onToggle={noop}
        onOnly={noop}
        onAll={noop}
      />
    </div>
  ),
};

export const Filters: Story = {
  render: () => (
    <FilterChips
      label="Who"
      value="Mark"
      onChange={noop}
      options={[
        { value: 'all', label: 'Everyone' },
        { value: 'Mark', label: 'Mark', count: 3 },
        { value: 'Anna', label: 'Anna', count: 1 },
        { value: '', label: 'No owner named', count: 2 },
      ]}
    />
  ),
};
