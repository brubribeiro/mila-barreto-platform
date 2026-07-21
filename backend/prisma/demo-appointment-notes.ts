import { AppointmentStatus } from '@prisma/client';

const ADMIN_NOTES = [
  'Paciente confirmou presença por WhatsApp.',
  'Chegar 10 minutos antes para preenchimento de ficha.',
  'Preferência por atendimento no período da manhã.',
  'Primeira sessão — orientar sobre contraindicações e cuidados pós.',
  'Retorno agendado após avaliação da profissional.',
  'Paciente solicitou lembrete no dia anterior.',
  'Pagamento combinado na recepção antes do procedimento.',
  'Paciente com histórico de sensibilidade — reforçar comunicação prévia.',
  'Agendamento remarcado a pedido da paciente; nova data confirmada.',
  'Indicada pela profissional após último atendimento concluído.',
];

const CLINICAL_BY_PROCEDURE: Record<string, string[]> = {
  'Drenagem linfática': [
    'Sem edema ativo. Iniciar com pressão moderada em membros inferiores.',
    'Paciente relata retenção de líquido; foco em abdômen e flancos.',
    'Boa resposta na sessão anterior. Manter frequência semanal.',
    'Evitar área com hematoma recente no braço direito.',
  ],
  'Limpeza de pele': [
    'Pele oleosa em zona T; extrair comedões com cuidado.',
    'Hipersensibilidade leve — evitar ácidos fortes nesta sessão.',
    'Manter hidratação pós-procedimento; protetor solar reforçado.',
    'Presença de acne inflamatória leve na mandíbula.',
  ],
  'Peeling químico': [
    'Fitzpatrick III; usar concentração conservadora na primeira aplicação.',
    'Sem descamação ativa. Avaliar tolerância antes de intensificar.',
    'Orientar fotoproteção rigorosa por 7 dias.',
    'Queixa de manchas em melasma leve — monitorar resposta.',
  ],
  'Microagulhamento': [
    'Sem infecção ativa. Assepsia reforçada antes do procedimento.',
    'Aplicar sérum reparador pós-sessão; evitar maquiagem por 24 h.',
    'Sessão 2/4 do protocolo facial — manter intervalo de 30 dias.',
    'Pele reativa; reduzir profundidade das agulhas na região malar.',
  ],
  'Botox 50ui': [
    'Mapeamento de rugas dinâmicas em glabela e fronte.',
    'Sem anticoagulantes nos últimos 7 dias, conforme anamnese.',
    'Retorno em 15 dias para avaliação de simetria.',
    'Dose ajustada em comparação com sessão anterior.',
  ],
  'Preenchimento Labial': [
    'Hidratação prévia recomendada; evitar exercício intenso no dia.',
    'Volume moderado solicitado; priorizar contorno natural.',
    'Avaliar equilísimo labial antes da aplicação.',
    'Paciente sem histórico de granulomas ou reações alérgicas.',
  ],
  'Secagem de Microvasos': [
    'Telangiectasias em nariz e bochechas — proteção ocular obrigatória.',
    'Pele morena; ajustar parâmetros do equipamento.',
    'Evitar sol direto por 15 dias após o procedimento.',
  ],
};

const GENERIC_CLINICAL = [
  'Paciente orientada sobre cuidados pós-procedimento.',
  'Sem intercorrências durante o atendimento.',
  'Evolução dentro do esperado; acompanhamento na próxima consulta.',
  'Queixa principal registrada na anamnese do dia.',
];

function hashIndex(input: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function demoAdminNote(seedKey: string): string {
  return ADMIN_NOTES[hashIndex(seedKey, ADMIN_NOTES.length)];
}

export function demoClinicalNote(
  procedureName: string | undefined,
  status: AppointmentStatus,
  seedKey: string,
): string {
  const pool = (procedureName && CLINICAL_BY_PROCEDURE[procedureName]) || GENERIC_CLINICAL;
  const base = pool[hashIndex(`${seedKey}:${procedureName ?? ''}`, pool.length)];

  if (status === 'COMPLETED') return `${base} Procedimento concluído sem intercorrências.`;
  if (status === 'CONFIRMED') return `${base} Paciente confirmada para o horário.`;
  if (status === 'CANCELLED') return 'Atendimento cancelado; registrar motivo na recepção se necessário.';
  if (status === 'NO_SHOW') return 'Paciente não compareceu; tentar reagendamento.';
  return `${base} Aguardando confirmação de presença.`;
}

export function demoAppointmentNotes(
  seedKey: string,
  procedureName: string | undefined,
  status: AppointmentStatus,
): { notes: string; clinicalNotes: string } {
  return {
    notes: demoAdminNote(seedKey),
    clinicalNotes: demoClinicalNote(procedureName, status, seedKey),
  };
}
