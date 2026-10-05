import type { Meta, StoryObj } from '@storybook/react-vite';
import { CostBreakdown, MetricTile } from '@/components/domain/metrics';
import { t1Result } from '@/fixtures';

const meta = { title: 'Metrics/Time and cost' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tiles: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
      <MetricTile icon="time" label="Time to result" value="16.3 s" sub="p50 · p90 46.2 s" />
      <MetricTile icon="cost" label="Cost per audio minute" value="$0.0071" sub="$0.0084 per run · list prices" />
      <MetricTile icon="review" label="Unsupported items" value="0" sub="extras, upgraded statuses, guessed owners or dates" />
    </div>
  ),
};

/** The real metrics of one T1 run. */
export const CostOfARun: Story = { render: () => <div className="max-w-2xl"><CostBreakdown metrics={t1Result.metrics} /></div> };
