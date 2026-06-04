/**
 * Remove todos os pacientes e dados vinculados (agendamentos, pacotes, lançamentos).
 * Uso: npm run prisma:cleanup-patients
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n→ Removendo pacientes...');

  const patients = await prisma.patient.findMany({ select: { id: true } });
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
  console.log(`  ✓ ${apptAll.count} agendamento(s) removido(s)`);
  console.log(`  ✓ ${packages.count} pacote(s) de paciente removido(s)`);
  console.log(
    `  ✓ ${finByPatient.count + finByAppt.count} lançamento(s) financeiro(s) removido(s)`,
  );
  console.log('\nConcluído.\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
