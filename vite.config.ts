import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: {
    rolldownOptions: {
      input: {
        game: fileURLToPath(new URL('./index.html', import.meta.url)),
        marbles: fileURLToPath(new URL('./marbles.html', import.meta.url)),
      },
    },
  },
});