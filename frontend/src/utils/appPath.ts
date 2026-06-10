const APP_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Absolute path including the Vite base (e.g. `/painel/login`). */
export function appPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${APP_BASE}${normalized}`;
}

export function isLoginPath(): boolean {
  return window.location.pathname === appPath('/login');
}
