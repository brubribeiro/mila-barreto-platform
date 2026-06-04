/**
 * Cadastra pacientes fictícios de demonstração (idempotente por CPF/e-mail).
 * Uso: npm run prisma:seed-patients
 */
import { Prisma, PrismaClient } from '@prisma/client';

import {
  birthDateFromDdMmYyyy,
  birthDdMmFromDayAndYearThisMonth,
  demoPatientsBirthdayCurrentMonthImport,
  demoPatientsFromImport,
} from './patient-demo-data';

const prisma = new PrismaClient();

export async function seedPatients(client: PrismaClient = prisma) {
  console.log('\n→ Pacientes de demonstração (importação)...');
  let createdImport = 0;
  for (const p of demoPatientsFromImport) {
    const existing = await client.patient.findFirst({
      where: { OR: [{ document: p.document }, { email: p.email }] },
    });
    if (existing) {
      console.log(`  • Paciente já existe (CPF ou e-mail): ${p.name}`);
      continue;
    }
    await client.patient.create({
      data: {
        name: p.name,
        email: p.email,
        phone: p.phone,
        birthDate: birthDateFromDdMmYyyy(p.dataNasc),
        document: p.document,
        address: p.address,
        anamnesis: { ...p.anamnesis, importacaoDemo: true } as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(`  ✓ Paciente criado: ${p.name}`);
    createdImport++;
  }
  if (createdImport === 0 && demoPatientsFromImport.length > 0) {
    console.log('  • Nenhum paciente novo da importação (todos já existiam).');
  }

  console.log('\n→ Pacientes (aniversário no mês ATUAL conforme calendário)...');
  let createdBirthday = 0;
  for (const p of demoPatientsBirthdayCurrentMonthImport) {
    const existing = await client.patient.findFirst({
      where: { OR: [{ document: p.document }, { email: p.email }] },
    });
    if (existing) {
      console.log(`  • Paciente já existe (CPF ou e-mail): ${p.name}`);
      continue;
    }
    const dataNasc = birthDdMmFromDayAndYearThisMonth(p.birthDayOfMonth, p.birthYear);
    await client.patient.create({
      data: {
        name: p.name,
        email: p.email,
        phone: p.phone,
        birthDate: birthDateFromDdMmYyyy(dataNasc),
        document: p.document,
        address: p.address,
        anamnesis: {
          ...p.anamnesis,
          importacaoDemo: true,
          nascimentoOriginalGerador: p.dataNascOriginal,
          aniversarioNoMesDaExecucaoDoSeed: true,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(`  ✓ Paciente criado: ${p.name} (nasc. ${dataNasc})`);
    createdBirthday++;
  }
  if (createdBirthday === 0 && demoPatientsBirthdayCurrentMonthImport.length > 0) {
    console.log('  • Nenhum paciente novo de aniversário (todos já existiam).');
  }

  const total = await client.patient.count();
  console.log(`\n  Total de pacientes no banco: ${total}`);
}

async function main() {
  await seedPatients();
  console.log('\nSeed de pacientes concluído.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
