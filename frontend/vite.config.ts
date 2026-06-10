/// <reference types="vitest" />
import { readFileSync } from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const appVersion = readFileSync(path.resolve(__dirname, '../VERSION'), 'utf8').trim();

export default defineConfig({
  base: '/painel',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
  server: {
    port: 5173,
    allowedHosts: true,
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
        secure: false
      },
    },
  },
});
