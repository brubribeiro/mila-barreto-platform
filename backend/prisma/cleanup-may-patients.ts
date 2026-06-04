/**
 * Remove agendamentos de maio (ano atual) e todos os pacientes com dados relacionados.
 * Uso: npx ts-node --transpile-only prisma/cleanup-may-patients.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const year = new Date().getFullYear();
  const mayStart = new Date(year, 4, 1, 0, 0, 0, 0);
  const juneStart = new Date(year, 5, 1, 0, 0, 0, 0);

  console.log(`\n→ Removendo agendamentos de maio/${year}...`);

  const mayAppointments = await prisma.appointment.findMany({
    where: { startAt: { gte: mayStart, lt: juneStart } },
    select: { id: true },
  });
  const mayIds = mayAppointments.map((a) => a.id);

  if (mayIds.length > 0) {
    const finMay = await prisma.financialEntry.deleteMany({
      where: { appointmentId: { in: mayIds } },
    });
    const apptMay = await prisma.appointment.deleteMany({
      where: { id: { in: mayIds } },
    });
    console.log(`  ✓ ${apptMay.count} agendamento(s) de maio removido(s)`);
    console.log(`  ✓ ${finMay.count} lançamento(s) financeiro(s) vinculado(s) removido(s)`);
  } else {
    console.log('  • Nenhum agendamento em maio encontrado');
  }

  console.log('\n→ Removendo todos os pacientes...');

  const patients = await prisma.patient.findMany({ select: { id: true, name: true } });
  const patientIds = patients.map((p) => p.id);

  if (patientIds.length === 0) {
    console.log('  • Nenhum paciente cadastrado');
    return;
  }

  const finByPatient = await prisma.financialEntry.deleteMany({
    where: { patientId: { in: patientIds } },
  });

  const patientAppointments = await prisma.appointment.findMany({
    where: { patientId: { in: patientIds } },
    select: { id: true },
  });
  const patientApptIds = patientAppointments.map((a) => a.id);

  let finByAppt = { count: 0 };
  if (patientApptIds.length > 0) {
    finByAppt = await prisma.financialEntry.deleteMany({
      where: { appointmentId: { in: patientApptIds } },
    });
  }

  const apptAll = await prisma.appointment.deleteMany({
    where: { patientId: { in: patientIds } },
  });

  const packages = await prisma.patientPackage.deleteMany({
    where: { patientId: { in: patientIds } },
  });

  const deletedPatients = await prisma.patient.deleteMany({
    where: { id: { in: patientIds } },
  });

  console.log(`  ✓ ${deletedPatients.count} paciente(s) removido(s)`);
  console.log(`  ✓ ${apptAll.count} agendamento(s) restante(s) dos pacientes removido(s)`);
  console.log(`  ✓ ${packages.count} pacote(s) de paciente removido(s)`);
  console.log(
    `  ✓ ${finByPatient.count + finByAppt.count} lançamento(s) financeiro(s) de pacientes removido(s)`,
  );
  console.log('\nConcluído.\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
