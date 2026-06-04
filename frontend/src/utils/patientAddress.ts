import type { Patient } from '../types';
import type { ViaCepOk } from './viaCep';

export interface PatientAddressFormFields {
  cep?: string;
  addressStreet?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressNumber?: string;
  addressComplement?: string;
}

export function formatPatientAddressDisplay(
  patient: Partial<Patient> | PatientAddressFormFields,
): string {
  const street = patient.addressStreet?.trim();
  const number = patient.addressNumber?.trim();
  const complement = patient.addressComplement?.trim();
  const neighborhood = patient.addressNeighborhood?.trim();
  const city = patient.addressCity?.trim();
  const state = patient.addressState?.trim();

  const chunks: string[] = [];

  if (street) {
    let line = street;
    if (number) line += `, ${number}`;
    if (complement) line += ` — ${complement}`;
    chunks.push(line);
  } else if (number || complement) {
    chunks.push([number, complement].filter(Boolean).join(' — '));
  }

  const cityLine = [neighborhood, city && state ? `${city}/${state}` : city || state]
    .filter(Boolean)
    .join(', ');
  if (cityLine) chunks.push(cityLine);

  if (chunks.length > 0) return chunks.join(' · ');

  return ('address' in patient ? patient.address : undefined)?.trim() ?? '';
}

export function applyViaCepToAddressFields(
  data: ViaCepOk,
  setters: {
    setStreet: (v: string) => void;
    setNeighborhood: (v: string) => void;
    setCity: (v: string) => void;
    setState: (v: string) => void;
  },
) {
  setters.setStreet(data.logradouro?.trim() ?? '');
  setters.setNeighborhood(data.bairro?.trim() ?? '');
  setters.setCity(data.localidade?.trim() ?? '');
  setters.setState(data.uf?.trim() ?? '');
}

export function clearViaCepAddressFields(setters: {
  setStreet: (v: string) => void;
  setNeighborhood: (v: string) => void;
  setCity: (v: string) => void;
  setState: (v: string) => void;
}) {
  setters.setStreet('');
  setters.setNeighborhood('');
  setters.setCity('');
  setters.setState('');
}
