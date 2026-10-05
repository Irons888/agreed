import type { Meta, StoryObj } from '@storybook/react-vite';
import { prepareSample, type PreparedAudio } from '@/lib/audio/prepare';
import { HomePage } from '@/pages/home';
import { QualityPage } from '@/pages/quality';
import { RunPage, type RunState } from '@/pages/run';
import { declinedResult, emptyResult, t1Result, unnamedResult } from '@/fixtures';
import type { Result as RunResult } from '../../../worker/types';

const meta = { title: 'Pages/Screens', parameters: { layout: 'fullscreen', audio: false } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const loadT1 = async () => ({ audio: await prepareSample('/samples/T1-main.wav', 'T1-main.wav') });

const run = (audio: PreparedAudio, result: RunResult | null, extra: Partial<RunState> = {}): RunState => ({
  key: 1,
  audio,
  steps: {
    prepare: { status: 'done', ms: 240 },
    transcribe: { status: 'done', ms: 2149 },
    extract: result ? { status: 'done', ms: 13955 } : { status: 'active', startedAt: Date.now() - 4100 },
    verify: result ? { status: 'done', ms: 7 } : { status: 'pending' },
  },
  transcript: { speakers: result?.speakers ?? unnamedResult.speakers, turns: t1Result.turns },
  result,
  error: null,
  clientMs: result ? 16300 : null,
  ...extra,
});

export const Home: Story = { render: () => <HomePage onStart={() => {}} /> };

export const Processing: Story = {
  loaders: [loadT1],
  render: (_, { loaded }) => <RunPage run={run(loaded.audio as PreparedAudio, null)} onNew={() => {}} onRetry={() => {}} />,
};

export const Result: Story = {
  loaders: [loadT1],
  render: (_, { loaded }) => <RunPage run={run(loaded.audio as PreparedAudio, t1Result)} onNew={() => {}} onRetry={() => {}} />,
};

export const ResultUnnamedSpeakers: Story = {
  loaders: [loadT1],
  render: (_, { loaded }) => <RunPage run={run(loaded.audio as PreparedAudio, unnamedResult)} onNew={() => {}} onRetry={() => {}} />,
};

export const ResultNothingFound: Story = {
  loaders: [loadT1],
  render: (_, { loaded }) => <RunPage run={run(loaded.audio as PreparedAudio, emptyResult)} onNew={() => {}} onRetry={() => {}} />,
};

export const Declined: Story = {
  loaders: [loadT1],
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

export const Quality: Story = { render: () => <QualityPage /> };
