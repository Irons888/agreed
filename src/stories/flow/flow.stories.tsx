import type { Meta, StoryObj } from '@storybook/react-vite';
import { CallDateForm, ReviewActions, SpeakerNamesCard } from '@/components/domain/clarify';
import { PipelineProgress } from '@/components/domain/progress';
import { RunDetails } from '@/components/domain/run-details';
import { RunHeader } from '@/components/domain/run-header';
import { DeclineState, EmptyResult, ErrorState } from '@/components/domain/states';
import { Button } from '@/components/ui/button';
import { declinedResult, t1Result, unnamedResult } from '@/fixtures';

const meta = { title: 'Flow/Processing and answers' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const wrap = (node: React.ReactNode) => <div className="max-w-xl">{node}</div>;

export const ProgressWorking: Story = {
  render: () =>
    wrap(
      <PipelineProgress
        steps={{
          prepare: { status: 'done', ms: 240 },
          transcribe: { status: 'done', ms: 2149 },
          extract: { status: 'active', startedAt: Date.now() - 3200 },
          verify: { status: 'pending' },
        }}
      />,
    ),
};

export const ProgressDone: Story = {
  render: () =>
    wrap(
      <PipelineProgress
        steps={{ prepare: { status: 'done', ms: 240 }, transcribe: { status: 'done', ms: 2149 }, extract: { status: 'done', ms: 13955 }, verify: { status: 'done', ms: 7 } }}
      />,
    ),
};

export const ProgressFailed: Story = {
  render: () =>
    wrap(
      <PipelineProgress
        steps={{ prepare: { status: 'done', ms: 240 }, transcribe: { status: 'done', ms: 2149 }, extract: { status: 'error' }, verify: { status: 'pending' } }}
      />,
    ),
};

export const AskWhoIsSpeaking: Story = { render: () => wrap(<SpeakerNamesCard result={unnamedResult} onName={() => {}} />) };
export const AskCallDate: Story = { render: () => wrap(<CallDateForm onDate={() => {}} onCancel={() => {}} />) };
export const ReviewDecision: Story = { render: () => wrap(<ReviewActions onAgree={() => {}} onKeep={() => {}} />) };

export const Declined: Story = { render: () => wrap(<DeclineState result={declinedResult} onNew={() => {}} />) };
export const NothingFound: Story = { render: () => wrap(<EmptyResult />) };
export const Failed: Story = {
  render: () => wrap(<ErrorState message="Extraction failed after 2 attempts: the model's answer did not match the schema." onRetry={() => {}} onNew={() => {}} />),
};

export const Header: Story = {
  render: () => (
    <RunHeader
      fileName="T1-main.wav"
      durationSec={t1Result.durationSec}
      speakers={t1Result.speakers}
      actions={
        <>
          <Button icon="copy">Copy the list</Button>
          <Button variant="primary" icon="upload">
            New recording
          </Button>
        </>
      }
    />
  ),
};

/** Folded at the bottom of a result: checks, removed items, time, cost, JSON. */
export const HowThisWasChecked: Story = { render: () => wrap(<RunDetails result={t1Result} clientMs={16300} onDownload={() => {}} />) };
