/**
 * Importa pacientes de um arquivo JSON (export legado).
 * Uso: npm run prisma:import-patients -- prisma/data/patients-import.json
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { PrismaClient } from '@prisma/client';

import {
  LegacyPatientRow,
  mapLegacyPatientRow,
  shouldSkipRow,
} from './import-patients-utils';

const prisma = new PrismaClient();

async function findExisting(mapped: ReturnType<typeof mapLegacyPatientRow>) {
  const or: object[] = [];

  if (mapped.externalId) {
    or.push({
      anamnesis: {
        path: ['externalId'],
        equals: mapped.externalId,
      },
    });
  }
  if (mapped.document) or.push({ document: mapped.document });
  if (mapped.email) or.push({ email: mapped.email });
  if (mapped.phone) or.push({ phone: mapped.phone });

  if (or.length === 0) {
    return prisma.patient.findFirst({
      where: { name: { equals: mapped.name, mode: 'insensitive' } },
    });
  }

  return prisma.patient.findFirst({ where: { OR: or } });
}

export async function importPatientsFromRows(rows: LegacyPatientRow[]) {
  let created = 0;
  let skipped = 0;
  let existing = 0;
  let errors = 0;

  for (const row of rows) {
    if (shouldSkipRow(row)) {
      skipped++;
      continue;
    }

    try {
      const mapped = mapLegacyPatientRow(row);
      const found = await findExisting(mapped);
      if (found) {
        existing++;
        console.log(`  • Já existe: ${mapped.name}`);
        continue;
      }

      await prisma.patient.create({
        data: {
          name: mapped.name,
          email: mapped.email,
          phone: mapped.phone,
          birthDate: mapped.birthDate,
          sex: mapped.sex,
          document: mapped.document,
          cep: mapped.cep,
          addressStreet: mapped.addressStreet,
          addressNeighborhood: mapped.addressNeighborhood,
          addressCity: mapped.addressCity,
          addressState: mapped.addressState,
          addressNumber: mapped.addressNumber,
          addressComplement: mapped.addressComplement,
          address: mapped.address,
          notes: mapped.notes,
          anamnesis: mapped.anamnesis,
        },
      });
      created++;
      console.log(`  ✓ ${mapped.name}`);
    } catch (err) {
      errors++;
      const name = String(row.Name ?? '(sem nome)');
      console.log(`  ✗ ${name}: ${err instanceof Error ? err.message : err}`);
    }
  }

  return { created, existing, skipped, errors, total: rows.length };
}

async function main() {
  const fileArg = process.argv[2] ?? 'prisma/data/patients-import.json';
  const filePath = resolve(process.cwd(), fileArg);

  console.log(`\n→ Importando pacientes de ${filePath}...`);
  const raw = readFileSync(filePath, 'utf8');
  const rows = JSON.parse(raw) as LegacyPatientRow[];

  if (!Array.isArray(rows)) {
    throw new Error('O arquivo JSON deve conter um array de pacientes.');
  }

  const result = await importPatientsFromRows(rows);
  const total = await prisma.patient.count();

  console.log('\nResumo:');
  console.log(`  Total no arquivo: ${result.total}`);
  console.log(`  Criados: ${result.created}`);
  console.log(`  Já existiam: ${result.existing}`);
  console.log(`  Ignorados (inativos): ${result.skipped}`);
  console.log(`  Erros: ${result.errors}`);
  console.log(`  Pacientes no banco: ${total}`);
  console.log('\nImportação concluída.\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
