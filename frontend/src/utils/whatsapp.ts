import { onlyDigits } from './masks';
import dayjs from 'dayjs';

export interface TemplateVars {
  paciente_nome?: string;
  procedimento?: string;
  data?: string;
  hora?: string;
  profissional?: string;
  clinica?: string;
}

export function renderTemplate(content: string, vars: TemplateVars): string {
  return content.replace(/\{(\w+)\}/g, (_, key) => {
    const v = (vars as any)[key];
    return v != null ? String(v) : '';
  });
}

export function whatsappLink(phone: string, message: string): string {
  let digits = onlyDigits(phone);
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

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
