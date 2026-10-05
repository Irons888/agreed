import type { Meta, StoryObj } from '@storybook/react-vite';
import { VerificationList } from '@/components/domain/checks';
import { QuoteBlock } from '@/components/domain/quote';
import { TimestampButton } from '@/components/domain/timestamp';
import { agreedItem, changedItem, correctedOwnerItem, t1Result } from '@/fixtures';

const meta = {
  title: 'Commitments/Quote and checks',
  component: QuoteBlock,
  args: { evidence: agreedItem.evidence[agreedItem.evidence.length - 1], speakers: t1Result.speakers, id: 'story-quote' },
} satisfies Meta<typeof QuoteBlock>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Press ▶: it plays exactly these words from the real T1 recording. */
export const Quote: Story = {};

export const AllQuotesOfAnItem: Story = {
  render: () => (
    <div className="max-w-xl space-y-3">
      {changedItem.evidence.map((e, i) => (
        <QuoteBlock key={i} evidence={e} speakers={t1Result.speakers} id={`changed-${i}`} />
      ))}
    </div>
  ),
};

export const Repaired: Story = { args: { evidence: { ...agreedItem.evidence[0], match: 'repaired' } } };

export const Timestamp: Story = {
  render: () => (
    <div className="flex gap-2">
      <TimestampButton id="ts-1" start={16.2} end={18.6} />
      <TimestampButton id="ts-2" start={57.1} end={58.9} />
    </div>
  ),
};

export const Checks: Story = { render: () => <VerificationList checks={correctedOwnerItem.checks} /> };

export const NoAudio: Story = { parameters: { audio: false } };
