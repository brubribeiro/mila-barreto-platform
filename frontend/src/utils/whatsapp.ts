import { onlyDigits } from './masks';
import dayjs from 'dayjs';

/**
 * Variáveis aceitas nos templates de mensagem.
 * Permite passar valores opcionais — variáveis ausentes ficam vazias na mensagem.
 */
export interface TemplateVars {
  paciente_nome?: string;
  procedimento?: string;
  data?: string; // formatada DD/MM/YYYY
  hora?: string; // HH:mm
  profissional?: string;
  clinica?: string;
}

/** Substitui {variavel} por valores. Tags sem valor viram string vazia. */
export function renderTemplate(content: string, vars: TemplateVars): string {
  return content.replace(/\{(\w+)\}/g, (_, key) => {
    const v = (vars as any)[key];
    return v != null ? String(v) : '';
  });
}

/**
 * Monta a URL `https://wa.me/...` com texto pré-preenchido.
 * Adiciona +55 se o telefone tiver 10 ou 11 dígitos (formato BR).
 */
export function whatsappLink(phone: string, message: string): string {
  let digits = onlyDigits(phone);
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Helper para criar vars a partir de um appointment populado. */
export function varsFromAppointment(appt: {
  patient?: { name?: string };
  procedure?: { name?: string };
  professional?: { name?: string };
  startAt: string;
}): TemplateVars {
  return {
    paciente_nome: appt.patient?.name?.split(' ')[0],
    procedimento: appt.procedure?.name,
    data: dayjs(appt.startAt).format('DD/MM/YYYY'),
    hora: dayjs(appt.startAt).format('HH:mm'),
    profissional: appt.professional?.name?.split(' ')[0],
  };
}
