import type { TourStep } from './GuidedTour';

export interface ScreenTour {
  /** Chave da tela na persistência (por usuário). */
  key: string;
  path: string;
  steps: TourStep[];
}

// Último passo de todos os tours: aponta o botão do header que reabre o tour.
const HELP_STEP: TourStep = {
  target: 'tour-help',
  title: 'Ver de novo',
  body: 'Esqueceu algum passo? Toque em “Como funciona?” para rever este tour quando quiser.',
};

/**
 * Tours por tela, exibidos na primeira visita. `target` é o `data-tour` do elemento;
 * passos cujo elemento não está na tela (sem permissão, sem dados) são pulados.
 */
const SCREEN_TOURS: ScreenTour[] = [
  {
    key: 'agenda',
    path: '/agenda',
    steps: [
      {
        title: 'Sua agenda',
        body: 'Aqui ficam os agendamentos, feriados e bloqueios de horário dos profissionais. Veja o básico em poucos passos.',
      },
      {
        target: 'agenda-new',
        title: 'Novo agendamento',
        body: 'Crie um agendamento por aqui, de qualquer tela. Na agenda, também dá para clicar num horário livre.',
      },
      {
        target: 'agenda-pending',
        title: 'Agendamentos pendentes',
        body: 'Atendimentos que já passaram e ainda esperam um status aparecem aqui. Abra cada um para concluir.',
      },
      {
        target: 'agenda-toolbar',
        title: 'Navegue pelo período',
        body: 'Use as setas e “Hoje” para mudar a data e alterne entre Dia, Semana e Mês.',
      },
      {
        target: 'agenda-legend',
        title: 'Cores dos status',
        body: 'Cada cor indica o status do agendamento: confirmado, concluído, cancelado e os demais.',
      },
      {
        target: 'agenda-calendar',
        title: 'Calendário',
        body: 'Clique num agendamento para ver os detalhes, remarcar ou mudar o status. Horários bloqueados não aceitam novos agendamentos.',
      },
      HELP_STEP,
    ],
  },
  {
    key: 'pacientes',
    path: '/pacientes',
    steps: [
      {
        title: 'Pacientes',
        body: 'Cadastro, histórico e anamnese de cada paciente da clínica, num só lugar.',
      },
      {
        target: 'patients-stats',
        title: 'Resumo',
        body: 'Total de pacientes, ativos nos últimos 90 dias, novos no mês e ticket médio.',
      },
      {
        target: 'patients-list',
        title: 'Lista de pacientes',
        body: 'Busque por nome, CPF ou telefone e ordene pelas colunas. Clique numa linha para abrir a ficha; pelos ícones dela você manda WhatsApp e preenche a anamnese.',
      },
      {
        target: 'patients-new',
        title: 'Adicionar paciente',
        body: 'Cadastre um novo paciente com dados de contato e documentos.',
      },
      HELP_STEP,
    ],
  },
  {
    key: 'financeiro',
    path: '/financeiro',
    steps: [
      {
        title: 'Financeiro',
        body: 'Receitas e despesas da clínica no período escolhido.',
      },
      {
        target: 'finance-period',
        title: 'Período e lançamentos',
        body: 'Escolha as datas “De” e “Até”: tudo na tela segue esse período. Registre receitas e despesas em “Novo lançamento”.',
      },
      {
        target: 'finance-kpis',
        title: 'Indicadores',
        body: 'Receitas, despesas, lucro e notas pendentes do período. Clique em “Notas pendentes” para filtrar a lista.',
      },
      {
        target: 'finance-transactions',
        title: 'Transações',
        body: 'Busque, filtre por tipo ou nota fiscal e exporte o período. O olho no topo esconde os valores da tela.',
      },
      HELP_STEP,
    ],
  },
];

export function getScreenTour(pathname: string): ScreenTour | undefined {
  return SCREEN_TOURS.find((t) => pathname === t.path);
}
