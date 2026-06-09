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

export const TEMPLATE_VARIABLES = [
  '{paciente_nome}',
  '{procedimento}',
  '{data}',
  '{hora}',
  '{profissional}',
  '{valor}',
] as const;
