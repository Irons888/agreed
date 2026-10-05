#!/usr/bin/env node
// Puts the static Storybook next to the app, so the design system is served at /storybook/.
import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(ROOT, 'dist', 'client', 'storybook');
await rm(target, { recursive: true, force: true });
// The app already serves /samples and /quality on the same origin; don't ship a second copy.
const shared = ['samples', 'quality'].map((dir) => path.join(ROOT, 'storybook-static', dir));
await cp(path.join(ROOT, 'storybook-static'), target, { recursive: true, filter: (src) => !shared.some((dir) => src.startsWith(dir)) });
console.log('Storybook copied to dist/client/storybook');
