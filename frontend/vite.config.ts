/// <reference types="vitest" />
import { readFileSync } from 'fs';
import { defineConfig, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const appVersion = readFileSync(path.resolve(__dirname, '../VERSION'), 'utf8').trim();

// Landing pública na raiz: serve o mesmo index.html em `/` sem redirecionar para /painel
// (no Vercel, `/` já cai no index.html; main.tsx escolhe landing ou painel pelo path).
const landingAtRoot: Connect.NextHandleFunction = (req, _res, next) => {
  if (req.url === '/' || req.url?.startsWith('/?')) req.url = `/painel/${req.url.slice(1)}`;
  next();
};

export default defineConfig({
  base: '/painel',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    {
      name: 'landing-at-root',
      configureServer: (server) => void server.middlewares.use(landingAtRoot),
      configurePreviewServer: (server) => void server.middlewares.use(landingAtRoot),
    },
  ],
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
