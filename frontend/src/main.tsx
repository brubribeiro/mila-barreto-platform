import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ColorModeProvider } from './contexts/ColorModeContext';
import { appPath } from './utils/appPath';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

// Fora de /painel fica a landing pública: não carrega o app, o login Google nem a sessão
const panelBase = appPath('/').replace(/\/$/, '');
const { pathname } = window.location;
const isPanel = pathname === panelBase || pathname.startsWith(`${panelBase}/`);

const PanelRoot = lazy(() => import('./PanelRoot').then((m) => ({ default: m.PanelRoot })));
const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })));

if (isPanel) {
  // index.html traz o SEO da landing; o painel não deve ser indexado
  document.title = 'Mila Barreto - Plataforma';
  const robots = document.createElement('meta');
  robots.name = 'robots';
  robots.content = 'noindex';
  document.head.appendChild(robots);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorModeProvider>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>{isPanel ? <PanelRoot /> : <Landing />}</Suspense>
      </QueryClientProvider>
    </ColorModeProvider>
  </React.StrictMode>,
);
