import { create } from 'storybook/theming/create';

/** Storybook in the product's own look: forest, cream, lime; Geist for text, Geist Mono for code. */
export const agreedTheme = create({
  base: 'light',
  brandTitle: 'Agreed design system',
  brandUrl: '/',
  brandTarget: '_self',

  colorPrimary: '#0f2b24',
  colorSecondary: '#0f2b24',

  appBg: '#f7f4e9',
  appContentBg: '#fbfaf6',
  appPreviewBg: '#f7f4e9',
  appBorderColor: '#d8d0bf',
  appBorderRadius: 0,

  fontBase: '"Geist Variable", ui-sans-serif, system-ui, sans-serif',
  fontCode: '"Geist Mono Variable", ui-monospace, monospace',

  textColor: '#0f2b24',
  textMutedColor: '#57584c',
  textInverseColor: '#f7f4e9',

  barBg: '#fbfaf6',
  barTextColor: '#57584c',
  barSelectedColor: '#0f2b24',
  barHoverColor: '#0f2b24',

  buttonBg: '#fbfaf6',
  buttonBorder: '#0f2b24',
  booleanBg: '#eee9da',
  booleanSelectedBg: '#d8ee4e',

  inputBg: '#fbfaf6',
  inputBorder: '#0f2b24',
  inputTextColor: '#0f2b24',
  inputBorderRadius: 0,
});
