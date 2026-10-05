import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, IconButton } from '@/components/ui/button';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'Copy as Markdown' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'destructive'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { args: { variant: 'secondary', size: 'md', icon: 'copy' } };

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" icon="upload">
        New recording
      </Button>
      <Button icon="copy">Copy as Markdown</Button>
      <Button variant="ghost">Keep as spoken</Button>
      <Button variant="destructive" icon="delete">
        Delete recording
      </Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" icon="sample">
        Run
      </Button>
      <Button size="md" icon="download">
        JSON
      </Button>
      <Button size="lg" variant="primary" icon="file">
        Choose a file
      </Button>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" loading>
        Reading the audio…
      </Button>
      <Button disabled icon="sample">
        Run
      </Button>
      <Button icon="check">Copied</Button>
    </div>
  ),
};

export const IconOnly: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <IconButton icon="back" label="Back 5 seconds" size="sm" />
      <IconButton icon="play" label="Play recording" variant="primary" size="sm" />
      <IconButton icon="forward" label="Forward 5 seconds" size="sm" />
      <IconButton icon="close" label="Dismiss" />
    </div>
  ),
};
