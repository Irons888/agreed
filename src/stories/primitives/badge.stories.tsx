import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';

const meta = { title: 'Primitives/Badge', component: Badge, args: { children: 'Badge' } } satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { icon: 'checks', children: '2 corrections' } };
export const Small: Story = { args: { size: 'sm', children: 'T1 · run 3' } };
export const WithTooltip: Story = {
  render: () => (
    <Tooltip content="Tooltips explain a badge in one sentence.">
      <span className="inline-flex">
        <Badge icon="info">Hover me</Badge>
      </span>
    </Tooltip>
  ),
};
