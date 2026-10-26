import type { MessageTrigger } from '../../types';

export const categoryOptions = [
  { value: '', label: '—' },
  { value: 'confirmacao', label: 'Confirmação' },
  { value: 'lembrete', label: 'Lembrete' },
  { value: 'retorno', label: 'Retorno' },
  { value: 'aniversario', label: 'Aniversário' },
  { value: 'promocao', label: 'Promoção' },
  { value: 'livre', label: 'Livre' },
] as const;

export const categoryLabel: Record<string, string> = Object.fromEntries(
  categoryOptions.filter((c) => c.value).map((c) => [c.value, c.label]),
);

/** Ordem em que os gatilhos aparecem na lista (jornada do paciente). */
export const triggerOptions: { value: MessageTrigger; label: string }[] = [
  { value: 'ON_BOOKING', label: 'Ao agendar' },
  { value: 'DAY_BEFORE', label: '1 dia antes' },
  { value: 'BIRTHDAY', label: 'No dia do aniversário' },
  { value: 'AFTER_APPOINTMENT', label: 'Após o atendimento' },
  { value: 'INACTIVE_90_DAYS', label: '90 dias sem visita' },
  { value: 'MANUAL', label: 'Envio manual' },
];

export const triggerLabel = Object.fromEntries(
  triggerOptions.map((t) => [t.value, t.label]),
) as Record<MessageTrigger, string>;

export const triggerOrder = Object.fromEntries(
  triggerOptions.map((t, i) => [t.value, i]),
) as Record<MessageTrigger, number>;

/** Gatilho equivalente à categoria pedida por quem abre o envio pelo WhatsApp. */
export const triggerForCategory: Record<string, MessageTrigger> = {
  confirmacao: 'ON_BOOKING',
  lembrete: 'DAY_BEFORE',
  aniversario: 'BIRTHDAY',
  retorno: 'AFTER_APPOINTMENT',
};

export const TEMPLATE_VARIABLES = [
  '{nome}',
  '{procedimento}',
  '{data}',
  '{hora}',
  '{profissional}',
  '{valor}',
] as const;
