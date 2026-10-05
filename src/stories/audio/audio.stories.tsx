import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { PlayerBar } from '@/components/domain/player-bar';
import { SampleList, type Sample } from '@/components/domain/samples';
import { TranscriptView } from '@/components/domain/transcript';
import { UploadDropzone } from '@/components/domain/upload';
import { WaveformTimeline } from '@/components/domain/waveform';
import { prepareSample, type PreparedAudio } from '@/lib/audio/prepare';
import { t1Result } from '@/fixtures';

const meta = { title: 'Audio/Recording', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** The real T1 recording, decoded in the browser exactly like an upload. */
const loadT1 = async () => ({ audio: await prepareSample('/samples/T1-main.wav', 'T1-main.wav') });

function Panel({ audio }: { audio: PreparedAudio }) {
  const [highlighted, setHighlighted] = useState<string | null>(null);
  return (
    <div className="max-w-xl space-y-3 rounded-panel border border-border bg-surface p-4">
      <PlayerBar duration={audio.duration} />
      <WaveformTimeline peaks={audio.peaks} duration={audio.duration} turns={t1Result.turns} items={t1Result.items} highlighted={highlighted} onHighlight={setHighlighted} />
      <div className="max-h-96 overflow-y-auto border-t border-border pt-4">
        <TranscriptView turns={t1Result.turns} speakers={t1Result.speakers} items={t1Result.items} highlighted={highlighted} onHighlight={setHighlighted} />
      </div>
    </div>
  );
}

export const PlayerWaveformTranscript: Story = {
  loaders: [loadT1],
  render: (_, { loaded }) => <Panel audio={loaded.audio as PreparedAudio} />,
};

export const WaveformOnly: Story = {
  loaders: [loadT1],
  render: (_, { loaded }) => {
    const audio = loaded.audio as PreparedAudio;
    return (
      <div className="max-w-xl">
        <WaveformTimeline peaks={audio.peaks} duration={audio.duration} turns={t1Result.turns} items={t1Result.items} />
      </div>
    );
  },
};

export const TranscriptWithoutItems: Story = {
  render: () => (
    <div className="max-w-xl">
      <TranscriptView turns={t1Result.turns.slice(0, 6)} speakers={t1Result.speakers} />
    </div>
  ),
};

export const Upload: Story = { render: () => <div className="max-w-xl"><UploadDropzone onFile={() => {}} /></div> };
export const UploadReading: Story = { render: () => <div className="max-w-xl"><UploadDropzone onFile={() => {}} busy /></div> };
export const UploadTooLong: Story = {
  render: () => (
    <div className="max-w-xl">
      <UploadDropzone onFile={() => {}} error="The recording is 3:24 long. This prototype handles up to 3:00." />
    </div>
  ),
};

const samples: Sample[] = [
  { case: 'T1-main', title: 'Brightside portal: pre-launch sync', purpose: 'Normal input. Contains all five required cases plus one unresolved question.', outcome: 'result', durationSec: 70.96, url: '/samples/T1-main.wav' },
  { case: 'T3-ambiguous', title: 'Unnamed speakers, nothing firmly agreed', purpose: 'The product should ask instead of concluding.', outcome: 'clarify', durationSec: 39.5, url: '/samples/T3-ambiguous.wav' },
  { case: 'T5-three-voices', title: 'Three people on the call', purpose: 'Outside the scope: the product should decline.', outcome: 'decline', durationSec: 15.9, url: '/samples/T5-three-voices.wav' },
];

export const Samples: Story = { render: () => <div className="max-w-md"><SampleList samples={samples} busyCase={null} onRun={() => {}} /></div> };
export const SampleRunning: Story = { render: () => <div className="max-w-md"><SampleList samples={samples} busyCase="T1-main" onRun={() => {}} /></div> };
