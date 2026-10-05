import type { Meta, StoryObj } from '@storybook/react-vite';
import { DeadlineChange, DeadlineChip } from '@/components/domain/deadline';
import { OwnerChip } from '@/components/domain/owner';
import { ChangedBadge, StatusBadge } from '@/components/domain/status';

const meta = { title: 'Commitments/Status, owner, deadline', component: StatusBadge, args: { status: 'agreed' } } satisfies Meta<typeof StatusBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Statuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="agreed" />
      <StatusBadge status="open_question" />
      <StatusBadge status="needs_review" />
      <StatusBadge status="not_accepted" />
      <StatusBadge status="cancelled" />
      <ChangedBadge from={['by Thursday']} to="Monday" />
      <StatusBadge status="agreed" size="sm" />
    </div>
  ),
};

export const Owners: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <OwnerChip owner={{ kind: 'speaker', speaker: 'S2', name: 'Mark', how: 'commitment' }} />
      <OwnerChip owner={{ kind: 'speaker', speaker: 'S1', name: 'Anna', how: 'accepted_request' }} />
      <OwnerChip owner={{ kind: 'speaker', speaker: 'S2', name: 'Speaker 2', how: 'tentative' }} />
      <OwnerChip owner={{ kind: 'named', name: 'Lisa' }} />
      <OwnerChip owner={{ kind: 'none' }} />
    </div>
  ),
};

export const Deadlines: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <DeadlineChip deadline={{ kind: 'date', raw: 'by Friday', date: '2026-10-09', ambiguous: false, previous: [] }} />
        <DeadlineChip deadline={{ kind: 'date', raw: 'next Wednesday', date: '2026-10-14', ambiguous: true, previous: [] }} />
        <DeadlineChip deadline={{ kind: 'relative', raw: 'by Wednesday', date: null, ambiguous: false, previous: [] }} />
        <DeadlineChip deadline={{ kind: 'vague', raw: 'before launch', date: null, ambiguous: false, previous: [] }} />
        <DeadlineChip deadline={{ kind: 'none', raw: null, date: null, ambiguous: false, previous: [] }} />
      </div>
      <DeadlineChange previous={['by Thursday']} current="Monday" />
    </div>
  ),
};

export const LongText: Story = {
  render: () => (
    <div className="flex max-w-xs flex-wrap gap-2">
      <OwnerChip owner={{ kind: 'named', name: 'Maria from the finance and procurement team' }} />
      <DeadlineChip deadline={{ kind: 'relative', raw: 'after the thing next week, once legal signs off', date: null, ambiguous: false, previous: [] }} />
    </div>
  ),
};
