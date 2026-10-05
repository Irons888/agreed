import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReviewActions } from '@/components/domain/clarify';
import { CommitmentCard } from '@/components/domain/commitment-card';
import { ItemSections, SummaryLine } from '@/components/domain/sections';
import {
  agreedItem,
  ambiguousDateItem,
  cancelledItem,
  changedItem,
  correctedOwnerItem,
  datedItem,
  namedOwnerItem,
  needsReviewItem,
  noOwnerItem,
  notAcceptedItem,
  questionItem,
  t1Result,
} from '@/fixtures';

const meta = {
  title: 'Commitments/Commitment card',
  component: CommitmentCard,
  args: { item: agreedItem, speakers: t1Result.speakers },
  decorators: [(Story) => <div className="max-w-xl">{Story()}</div>],
} satisfies Meta<typeof CommitmentCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Agreed: Story = {};
export const DeadlineChanged: Story = { args: { item: changedItem } };
export const NoOwnerNamed: Story = { args: { item: noOwnerItem } };
export const OpenQuestion: Story = { args: { item: questionItem } };
export const NotAccepted: Story = { args: { item: notAcceptedItem, showStatus: true } };
export const Cancelled: Story = { args: { item: cancelledItem, showStatus: true } };
export const NeedsReview: Story = {
  args: { item: needsReviewItem, actions: <ReviewActions onAgree={() => {}} onKeep={() => {}} /> },
};
export const DatedDeadline: Story = { args: { item: datedItem } };
/** The call date is unknown: the deadline offers to set it, which dates every deadline at once. */
export const DateUnknownAskForIt: Story = { args: { item: agreedItem, onSetDate: () => {} } };
export const AmbiguousDate: Story = { args: { item: ambiguousDateItem } };
export const OwnerOutsideTheCall: Story = { args: { item: namedOwnerItem } };
export const CorrectedByVerification: Story = { args: { item: correctedOwnerItem, defaultOpen: true } };
export const Expanded: Story = { args: { item: changedItem, defaultOpen: true } };
export const Highlighted: Story = { args: { highlighted: true } };

export const Summary: StoryObj = {
  render: () => <SummaryLine items={t1Result.items} />,
};

export const AllSectionsFromT1: StoryObj = {
  render: () => <ItemSections items={t1Result.items} speakers={t1Result.speakers} highlighted={null} onHighlight={() => {}} />,
};
