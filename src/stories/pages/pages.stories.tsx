import type { Meta, StoryObj } from '@storybook/react-vite';
import { prepareSample, type PreparedAudio } from '@/lib/audio/prepare';
import { HistoryPage } from '@/pages/history';
import { HomePage } from '@/pages/home';
import { TasksPage } from '@/pages/tasks';
import { forgetRun, rememberRun } from '@/lib/history';
import { QualityPage } from '@/pages/quality';
import { RunPage, type RunState } from '@/pages/run';
import { declinedResult, emptyResult, t1Result, t4Result, unnamedResult } from '@/fixtures';
import type { Result as RunResult } from '../../../worker/types';

const meta = { title: 'Pages/Screens', parameters: { layout: 'fullscreen', audio: false } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// History stories write real fixture results into this browser's history, the same way a finished run does.
const fixtures: [RunResult, string][] = [
  [t1Result, 'T1-main.wav'],
  [t4Result, 'T4-dated.wav'],
  [unnamedResult, 'T3-ambiguous.wav'],
  [declinedResult, 'T5-three-voices.wav'],
];
const seedHistory = async () => {
  fixtures.forEach(([r, name]) => rememberRun(r, name));
  return {};
};
const clearHistory = async () => {
  fixtures.forEach(([r]) => forgetRun(r.id));
  return {};
};

const load = (name: string) => async () => ({ audio: await prepareSample(`/samples/${name}.wav`, `${name}.wav`) });
const loadT1 = load('T1-main');

const run = (audio: PreparedAudio, result: RunResult | null, extra: Partial<RunState> = {}): RunState => ({
  key: 1,
  audio,
  steps: {
    prepare: { status: 'done', ms: 240 },
    transcribe: { status: 'done', ms: 2149 },
    extract: result ? { status: 'done', ms: 13955 } : { status: 'active', startedAt: Date.now() - 4100 },
    verify: result ? { status: 'done', ms: 7 } : { status: 'pending' },
  },
  transcript: { speakers: result?.speakers ?? t1Result.speakers.map((sp) => ({ ...sp, name: null, label: `Speaker ${sp.id.slice(1)}` })), turns: result?.turns ?? t1Result.turns },
  result,
  error: null,
  clientMs: result ? 16300 : null,
  ...extra,
});

export const Home: Story = { render: () => <HomePage onStart={() => {}} onNavigate={() => {}} /> };

/** A returning user: recent recordings and the latest tasks under the upload. */
export const HomeWithHistory: Story = { loaders: [seedHistory], render: () => <HomePage onStart={() => {}} onNavigate={() => {}} /> };

export const History: Story = { loaders: [seedHistory], render: () => <HistoryPage onNavigate={() => {}} /> };
export const HistoryEmpty: Story = { loaders: [clearHistory], render: () => <HistoryPage onNavigate={() => {}} /> };
export const Tasks: Story = { loaders: [seedHistory], render: () => <TasksPage onNavigate={() => {}} /> };
export const TasksEmpty: Story = { loaders: [clearHistory], render: () => <TasksPage onNavigate={() => {}} /> };

export const Processing: Story = {
  loaders: [loadT1],
  render: (_, { loaded }) => <RunPage run={run(loaded.audio as PreparedAudio, null)} onNew={() => {}} onRetry={() => {}} />,
};

export const Result: Story = {
  loaders: [loadT1],
  render: (_, { loaded }) => <RunPage run={run(loaded.audio as PreparedAudio, t1Result)} onNew={() => {}} onRetry={() => {}} />,
};

export const ResultUnnamedSpeakers: Story = {
  loaders: [load('T3-ambiguous')],
  render: (_, { loaded }) => <RunPage run={run(loaded.audio as PreparedAudio, unnamedResult)} onNew={() => {}} onRetry={() => {}} />,
};

export const ResultWithDates: Story = {
  loaders: [load('T4-dated')],
  render: (_, { loaded }) => <RunPage run={run(loaded.audio as PreparedAudio, t4Result)} onNew={() => {}} onRetry={() => {}} />,
};

export const ResultNothingFound: Story = {
  loaders: [loadT1],
  render: (_, { loaded }) => <RunPage run={run(loaded.audio as PreparedAudio, emptyResult)} onNew={() => {}} onRetry={() => {}} />,
};

export const Declined: Story = {
  loaders: [load('T5-three-voices')],
  render: (_, { loaded }) => <RunPage run={run(loaded.audio as PreparedAudio, declinedResult)} onNew={() => {}} onRetry={() => {}} />,
};

export const Failed: Story = {
  loaders: [loadT1],
  render: (_, { loaded }) => (
    <RunPage
      run={run(loaded.audio as PreparedAudio, null, { error: 'The connection closed before the result was ready.' })}
      onNew={() => {}}
      onRetry={() => {}}
    />
  ),
};

export const Quality: Story = { render: () => <QualityPage onStart={() => {}} /> };
