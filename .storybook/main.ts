import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  // Test recordings from public/samples make every ▶ button in the stories playable.
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
};

export default config;
