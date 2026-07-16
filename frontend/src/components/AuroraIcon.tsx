import { ReactNode } from 'react';

/**
 * Ícones de traço extraídos 1:1 do protótipo "Aurora" (estilo Lucide/Feather).
 * viewBox 0 0 24 24, stroke currentColor — herdam a cor do texto do container.
 */
const ICONS: Record<string, ReactNode> = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  agenda: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M7.5 14h2M11 14h2M14.5 14h2M7.5 17.5h2M11 17.5h2" />
    </>
  ),
  clientes: (
    <>
      <circle cx="9" cy="8.2" r="3.2" />
      <path d="M3.5 19.5a5.6 5.6 0 0 1 11 0" />
      <path d="M16.2 6.3a3 3 0 0 1 0 5.7" />
      <path d="M17.5 19.5a5.6 5.6 0 0 0-2.2-4.4" />
    </>
  ),
  profissionais: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M4 19.5a5.2 5.2 0 0 1 10 0" />
      <path d="M15.5 11.2l1.8 1.8 3.4-3.6" />
    </>
  ),
  procedimentos: (
    <path d="M12 3.2l2 4.6 4.9.5-3.7 3.3 1.1 4.8L12 16.4 7.7 19l1.1-4.8L5.1 10.9l4.9-.5z" />
  ),
  documentos: (
    <>
      <path d="M6 3h7l5 5v13H6z" />
      <path d="M13 3v5h5" />
      <path d="M9 13h6M9 16.5h6" />
    </>
  ),
  financeiro: (
    <>
      <rect x="2.5" y="6" width="19" height="13" rx="3.2" />
      <path d="M2.5 10.5h19" />
      <circle cx="17" cy="15" r="1.4" />
    </>
  ),
  pacotes: (
    <>
      <path d="M12 3l7.5 4v8.5L12 20l-7.5-4.5V7z" />
      <path d="M4.6 7L12 11l7.4-4" />
      <path d="M12 11v9" />
    </>
  ),
  promocoes: (
    <>
      <path d="M4 4.5h7L20 13l-7 7-8.5-8.5z" />
      <circle cx="8" cy="8.2" r="1.3" />
      <path d="M11 14.5l3.5-3.5" />
    </>
  ),
  horarios: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  equipamentos: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  estoque: (
    <>
      <rect x="3" y="4.5" width="18" height="4" rx="1.2" />
      <path d="M5 8.5v11h14v-11" />
      <path d="M9.5 12.5h5" />
    </>
  ),
  despesas: (
    <>
      <path d="M4 11a8 8 0 0 1 13.5-5.5L20 8" />
      <path d="M20 4v4h-4" />
      <path d="M20 13a8 8 0 0 1-13.5 5.5L4 16" />
      <path d="M4 20v-4h4" />
    </>
  ),
  pagamentos: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 9.5h19" />
      <circle cx="7" cy="15" r="1.1" />
      <path d="M11 15h3" />
    </>
  ),
  relatorios: (
    <>
      <path d="M4 4v16h16" />
      <rect x="7" y="12.5" width="2.6" height="5" rx="0.6" />
      <rect x="11.2" y="8.5" width="2.6" height="9" rx="0.6" />
      <rect x="15.4" y="5.5" width="2.6" height="12" rx="0.6" />
    </>
  ),
  metas: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.8" />
      <circle cx="12" cy="12" r="1.3" />
    </>
  ),
  mensagens: (
    <>
      <path d="M20.5 11.5a7.5 7.5 0 0 1-10.8 6.7L4 20l1.8-5.2A7.5 7.5 0 1 1 20.5 11.5z" />
      <path d="M8.5 11h7M8.5 8.5h4" />
    </>
  ),
  permissoes: (
    <>
      <path d="M12 3l7 2.8v5.2c0 4.6-3.1 7.6-7 9.2-3.9-1.6-7-4.6-7-9.2V5.8z" />
      <path d="M9 11.8l2 2 3.6-3.8" />
    </>
  ),
  // KPIs / cabeçalhos de card
  money: (
    <>
      <path d="M12 2v20" />
      <path d="M17 6.5c0-2-2.2-3-5-3s-5 1-5 3 2.2 2.5 5 3 5 1.4 5 3.5-2.2 3-5 3-5-1.2-5-3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  gift: (
    <>
      <path d="M4 21h16v-7H4z" />
      <path d="M5.5 14v-1.5a2.5 2.5 0 0 1 2.5-2.5h8a2.5 2.5 0 0 1 2.5 2.5V14" />
      <path d="M12 7.5V4M9.5 5.2h5" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 2.5h12v19l-2.5-1.6-2.5 1.6-2.5-1.6-2.5 1.6z" />
      <path d="M9 8h6M9 11.5h6" />
    </>
  ),
  calendarStar: (
    <>
      <path d="M3.5 5.5h17v15h-17z" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M12 12.6l.9 1.8 2 .3-1.45 1.4.35 2L12 17.1l-1.8.95.35-2L9.1 14.7l2-.3z" />
    </>
  ),
  // Header / ações
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M20 6L9 17l-5-5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  menu: <path d="M3.5 6h17M3.5 12h17M3.5 18h17" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
};

export type AuroraIconName = keyof typeof ICONS;

interface AuroraIconProps {
  name: AuroraIconName;
  size?: number;
  strokeWidth?: number;
}

export function AuroraIcon({ name, size = 22, strokeWidth = 1.75 }: AuroraIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
