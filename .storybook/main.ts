import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  // Test recordings from public/samples make every ▶ button playable. The deployed Storybook lives at
  // /storybook/ on the same origin as the app, so the static build reuses the app's /samples instead of a copy.
  staticDirs: process.env.STORYBOOK_FOR_DEPLOY ? [] : ['../public'],
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  // A reviewer opens the deployed design system, not a Storybook tutorial.
  features: { sidebarOnboardingChecklist: false, menuOnboardingChecklist: false },
};

export default config;
