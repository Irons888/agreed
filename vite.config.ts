import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { fileURLToPath } from 'node:url';

// Storybook reuses this config but must not start the Worker.
const inStorybook = process.env.npm_lifecycle_event?.includes('storybook');

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(inStorybook ? [] : [cloudflare()])],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
