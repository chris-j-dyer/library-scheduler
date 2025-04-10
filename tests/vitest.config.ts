import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, '../client/src'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@assets': path.resolve(__dirname, '../attached_assets')
    },
    deps: {
      inline: ['react', 'react-dom'],
    },
    // ✅ Add this block:
    coverage: {
      reporter: ['text', 'html'], // "text" for terminal output, "html" for browser view
    },
  },
});