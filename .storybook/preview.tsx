import '@fontsource-variable/onest';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '../src/styles/app.css';
import type { Decorator, Preview } from '@storybook/react-vite';
import { useEffect } from 'react';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { PlayerProvider } from '../src/lib/audio/player';
import { agreedTheme } from './theme';

const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme as 'light' | 'dark';
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return <Story />;
};

// Every story gets the real T1 recording, so quotes and the waveform can be played.
const withPlayer: Decorator = (Story, context) => (
  <TooltipProvider>
    <PlayerProvider url={context.parameters.audio === false ? null : (context.parameters.audio ?? '/samples/T1-main.wav')} duration={70.96}>
      <Story />
    </PlayerProvider>
  </TooltipProvider>
);

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [withPlayer, withTheme],
  parameters: {
    layout: 'padded',
    docs: { theme: agreedTheme },
    a11y: { test: 'error' },
    backgrounds: { disable: true },
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' } },
        tablet: { name: 'Tablet 768', styles: { width: '768px', height: '1024px' } },
        laptop: { name: 'Laptop 1024', styles: { width: '1024px', height: '768px' } },
        desktop: { name: 'Desktop 1440', styles: { width: '1440px', height: '900px' } },
      },
    },
    options: {
      storySort: {
        order: ['Introduction', 'Foundations', ['Colors', 'Typography', 'Spacing, lines, surfaces', 'Icons', 'Content'], 'Primitives', 'Commitments', 'History', 'Audio', 'Flow', 'Metrics', 'Pages'],
      },
    },
  },
};

export default preview;
