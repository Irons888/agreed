import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecordingRow, TaskRow } from '@/components/domain/history';
import type { HistoryEntry, TaskSummary } from '@/lib/history';

const meta = { title: 'History/Rows', decorators: [(Story) => <ul className="max-w-2xl border-2 border-border-strong bg-surface px-4">{Story()}</ul>] } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const task = (over: Partial<TaskSummary>): TaskSummary => ({ id: 't', title: 'Send API documentation', status: 'agreed', owner: 'Mark', deadline: '“by Wednesday”', at: 16, ...over });
const entry = (over: Partial<HistoryEntry>): HistoryEntry => ({
  id: 'r1',
  fileName: 'T1-main.wav',
  createdAt: new Date().toISOString(),
  durationSec: 70.96,
  outcome: 'result',
  note: null,
  items: [task({}), task({ id: 'q', status: 'open_question', title: 'Does the client need single sign-on?' }), task({ id: 'n', status: 'not_accepted', title: 'Add dark mode' })],
  edits: {},
  ...over,
});

/** Every status as a written-out line. */
export const Tasks: Story = {
  render: () => (
    <>
      <TaskRow task={task({})} from="T1-main.wav" onOpen={() => {}} />
      <TaskRow task={task({ id: '2', title: 'Prepare staging demo', deadline: '“Monday”, moved from “Thursday”', at: 57 })} from="T1-main.wav" onOpen={() => {}} />
      <TaskRow task={task({ id: '3', title: 'Update privacy policy page', owner: null, deadline: '“before launch”', at: 41 })} from="T1-main.wav" onOpen={() => {}} />
      <TaskRow task={task({ id: '4', title: 'Deploy the login bug fix', deadline: 'Tue, Oct 6, “tomorrow morning”', at: 17 })} from="T4-dated.wav" onOpen={() => {}} />
      <TaskRow task={task({ id: '5', status: 'needs_review', title: 'Fix export bug', owner: 'Speaker 2', deadline: '“by Friday”', at: 2 })} from="T3-ambiguous.wav" onOpen={() => {}} />
      <TaskRow task={task({ id: '6', status: 'open_question', title: 'Does the client need single sign-on?', at: 44 })} from="T1-main.wav" onOpen={() => {}} />
      <TaskRow task={task({ id: '7', status: 'not_accepted', title: 'Add dark mode', at: 24 })} from="T1-main.wav" />
      <TaskRow task={task({ id: '8', status: 'cancelled', title: 'Book meeting room', owner: 'Anna', at: 61 })} from="T1-main.wav" />
    </>
  ),
};

export const Recordings: Story = {
  render: () => (
    <>
      <RecordingRow entry={entry({})} onOpen={() => {}} />
      <RecordingRow entry={entry({ id: 'r2', fileName: 'T5-three-voices.wav', outcome: 'decline', items: [], note: 'More than two voices were detected.' })} onOpen={() => {}} />
      <RecordingRow entry={entry({ id: 'r3', fileName: 'old-call.m4a', createdAt: '2026-08-01T10:00:00.000Z' })} onOpen={() => {}} onForget={() => {}} />
    </>
  ),
};
