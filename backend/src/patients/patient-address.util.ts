export interface PatientAddressParts {
  addressStreet?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  address?: string | null;
}

export function composePatientAddress(parts: PatientAddressParts): string | undefined {
  const street = parts.addressStreet?.trim();
  const number = parts.addressNumber?.trim();
  const complement = parts.addressComplement?.trim();
  const neighborhood = parts.addressNeighborhood?.trim();
  const city = parts.addressCity?.trim();
  const state = parts.addressState?.trim();

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

  const legacy = parts.address?.trim();
  return legacy || undefined;
}
