export type MetricsTab = 'appointments' | 'patients' | 'procedures' | 'packages' | 'finance';

export const TABS: { value: MetricsTab; label: string }[] = [
  { value: 'appointments', label: 'Agendamentos' },
  { value: 'patients', label: 'Pacientes' },
  { value: 'procedures', label: 'Procedimentos' },
  { value: 'packages', label: 'Pacotes' },
  { value: 'finance', label: 'Financeiro' },
];

export const TAB_COLORS: Record<MetricsTab, string> = {
  finance: '#15998B',
  procedures: '#9B7BD4',
  packages: '#E0915B',
  patients: '#5BA8DE',
  appointments: '#D46B8A',
};

export const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const CHART_HEIGHT = 180;
export const TWO_COLUMNS = { xs: 1, lg: 'minmax(0, 1.55fr) minmax(0, 1fr)' };

export const DELTA_TONES = {
  up: { color: '#11A893', bg: 'rgba(17,168,147,.13)' },
  down: { color: '#D65A5A', bg: 'rgba(214,90,90,.13)' },
  neutral: { color: '#6E7B78', bg: 'rgba(110,123,120,.12)' },
} as const;

export type DeltaTone = keyof typeof DELTA_TONES;

export const FINANCE_CATEGORY_COLORS = ['#15998B', '#9B7BD4', '#E0915B', '#5BA8DE', '#D46B8A'];
export const FINANCE_TOP_CATEGORIES = 4;
