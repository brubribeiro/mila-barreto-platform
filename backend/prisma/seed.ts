import { AppointmentStatus, Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Mantém em sincronia com src/common/permissions.ts
const RESOURCES = [
  'patients',
  'appointments',
  'procedures',
  'packages',
  'finance',
  'inventory',
  'users',
  'roles',
  'messages',
  'availability',
  'metrics',
  'promotions',
  'payment-methods',
];
const ACTIONS = ['view', 'create', 'edit', 'delete'];
const ALL_PERMISSIONS = RESOURCES.flatMap((r) => ACTIONS.map((a) => `${r}:${a}`));

const defaultRoles = [
  {
    name: 'Administrador',
    description: 'Acesso total à plataforma',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
    restrictToOwnAppointments: false,
  },
  {
    name: 'Profissional',
    description: 'Vê apenas a própria agenda e edita pacientes',
    permissions: [
      'patients:view',
      'patients:edit',
      'appointments:view',
      'appointments:edit',
      'procedures:view',
      'packages:view',
      'inventory:view',
      'messages:view',
    ],
    isSystem: true,
    restrictToOwnAppointments: true,
  },
  {
    name: 'Recepção',
    description: 'Gerencia pacientes, agenda, estoque e mensagens (sem financeiro nem profissionais)',
    permissions: [
      'patients:view',
      'patients:create',
      'patients:edit',
      'appointments:view',
      'appointments:create',
      'appointments:edit',
      'appointments:delete',
      'procedures:view',
      'packages:view',
      'packages:create',
      'packages:edit',
      'inventory:view',
      'inventory:create',
      'inventory:edit',
      'messages:view',
      'messages:create',
      'messages:edit',
      'availability:edit',
    ],
    isSystem: true,
    restrictToOwnAppointments: false,
  },
];

const defaultUsers = [
  { name: 'Administrador', email: 'admin@mila.com', password: 'admin123', roleName: 'Administrador', providesAppointments: true },
  { name: 'Profissional Exemplo', email: 'profissional@mila.com', password: 'pro123', roleName: 'Profissional', providesAppointments: true },
  { name: 'Recepção', email: 'recepcao@mila.com', password: 'rec123', roleName: 'Recepção', providesAppointments: false },
];

const defaultTemplates = [
  {
    name: 'Confirmação de agendamento',
    category: 'confirmacao',
    content:
      'Olá, {paciente_nome}! Confirmando seu agendamento de {procedimento} no dia {data} às {hora} com {profissional}. Pode confirmar respondendo essa mensagem? 💆',
  },
  {
    name: 'Lembrete de retorno',
    category: 'retorno',
    content:
      'Oi, {paciente_nome}! Já faz um tempinho da nossa última sessão de {procedimento}. Que tal agendarmos seu retorno? 💚',
  },
  {
    name: 'Aniversário',
    category: 'aniversario',
    content: 'Feliz aniversário, {paciente_nome}! 🎉 Que esse novo ciclo traga muito bem-estar.',
  },
];

/** Despesas recorrentes fictícias (demonstração) — valores genéricos em BRL. */
const defaultRecurringExpenses = [
  {
    name: 'Internet e telefonia fixa',
    description: 'Plano combinado provedor.',
    amount: 189.9,
    category: 'Utilidades',
    expenseType: 'FIXED' as const,
    dueDay: 10,
  },
  {
    name: 'Energia elétrica',
    description: 'Média histórica mensal (variável conforme conta).',
    amount: 420,
    category: 'Utilidades',
    expenseType: 'VARIABLE' as const,
    dueDay: 15,
  },
  {
    name: 'Honorários contábeis',
    description: 'Mensalidade do escritório de contabilidade.',
    amount: 450,
    category: 'Serviços',
    expenseType: 'FIXED' as const,
    dueDay: 20,
  },
  {
    name: 'Assinatura de software / gestão',
    description: 'Sistema de agenda, financeiro ou similar.',
    amount: 149.9,
    category: 'Tecnologia',
    expenseType: 'FIXED' as const,
    dueDay: 1,
  },
  {
    name: 'Marketing e anúncios',
    description: 'Média mensal (Meta, Google, folder, etc.).',
    amount: 600,
    category: 'Marketing',
    expenseType: 'VARIABLE' as const,
    dueDay: 25,
  },
  {
    name: 'Reposição de insumos descartáveis',
    description: 'Luvas, gazes, aplicadores — média mensal.',
    amount: 350,
    category: 'Materiais',
    expenseType: 'VARIABLE' as const,
    dueDay: 28,
  },
];


/** Materiais de estoque para demonstração (identificados por SKU). */
const demoInventoryItems = [
  { sku: 'MAT-001', name: 'Sabonete facial neutro', unit: 'un', quantity: 50, minQuantity: 10, costPrice: 8.5, description: 'Limpeza inicial da pele' },
  { sku: 'MAT-002', name: 'Loção tônica facial', unit: 'ml', quantity: 500, minQuantity: 100, costPrice: 0.15, description: 'Tonificação pós-limpeza' },
  { sku: 'MAT-003', name: 'Máscara purificante', unit: 'un', quantity: 30, minQuantity: 5, costPrice: 12, description: 'Máscara de argila ou carvão' },
  { sku: 'MAT-004', name: 'Luva descartável (par)', unit: 'un', quantity: 200, minQuantity: 50, costPrice: 0.8 },
  { sku: 'MAT-005', name: 'Gaze estéril', unit: 'un', quantity: 500, minQuantity: 100, costPrice: 0.4 },
  { sku: 'MAT-006', name: 'Creme modelador drenagem', unit: 'ml', quantity: 2000, minQuantity: 300, costPrice: 0.12, description: 'Creme para massagem linfática' },
  { sku: 'MAT-007', name: 'Papel para drenagem', unit: 'un', quantity: 100, minQuantity: 20, costPrice: 2.5 },
  { sku: 'MAT-008', name: 'Óleo essencial drenagem', unit: 'ml', quantity: 500, minQuantity: 100, costPrice: 0.25 },
  { sku: 'MAT-009', name: 'Ácido glicólico 30%', unit: 'ml', quantity: 250, minQuantity: 50, costPrice: 1.2, description: 'Peeling químico superficial' },
  { sku: 'MAT-010', name: 'Neutralizante pH', unit: 'ml', quantity: 250, minQuantity: 50, costPrice: 0.9, description: 'Neutralização pós-peeling' },
  { sku: 'MAT-011', name: 'Protetor solar FPS 50', unit: 'un', quantity: 25, minQuantity: 5, costPrice: 18, description: 'Amostra pós-procedimento' },
  { sku: 'MAT-012', name: 'Soro fisiológico 0,9%', unit: 'ml', quantity: 1000, minQuantity: 200, costPrice: 0.05 },
  { sku: 'MAT-013', name: 'Disco microagulhamento', unit: 'un', quantity: 40, minQuantity: 10, costPrice: 22, description: 'Cartucho descartável 12 pinos' },
  { sku: 'MAT-014', name: 'Sérum vitamina C', unit: 'ml', quantity: 100, minQuantity: 20, costPrice: 2.5, description: 'Indução percutânea' },
  { sku: 'MAT-015', name: 'Máscara calmante pós-procedimento', unit: 'un', quantity: 20, minQuantity: 5, costPrice: 15 },
  { sku: 'MAT-016', name: 'Álcool 70%', unit: 'ml', quantity: 2000, minQuantity: 500, costPrice: 0.03, description: 'Assepsia de superfície' },
  { sku: 'MAT-017', name: 'Espátula descartável', unit: 'un', quantity: 150, minQuantity: 30, costPrice: 0.35 },
  { sku: 'MAT-018', name: 'Vaselina líquida', unit: 'ml', quantity: 300, minQuantity: 50, costPrice: 0.08, description: 'Lubrificante para microagulhamento' },
  { sku: 'MAT-019', name: 'Algodão hidrófilo', unit: 'un', quantity: 300, minQuantity: 60, costPrice: 0.25 },
  { sku: 'MAT-020', name: 'Máscara de hidratação intensiva', unit: 'un', quantity: 25, minQuantity: 5, costPrice: 14, description: 'Finalização limpeza de pele' },
] as const satisfies readonly { sku: string; name: string; unit: string; quantity: number; minQuantity: number; costPrice: number; description?: string }[];

/** Materiais previstos por procedimento (quantidade por atendimento). */
const demoProcedureMaterials: {
  procedureName: string;
  materials: { sku: string; quantity: number }[];
}[] = [
  {
    procedureName: 'Limpeza de pele',
    materials: [
      { sku: 'MAT-001', quantity: 1 },
      { sku: 'MAT-002', quantity: 5 },
      { sku: 'MAT-003', quantity: 1 },
      { sku: 'MAT-004', quantity: 1 },
      { sku: 'MAT-005', quantity: 2 },
      { sku: 'MAT-016', quantity: 10 },
      { sku: 'MAT-017', quantity: 1 },
      { sku: 'MAT-019', quantity: 3 },
      { sku: 'MAT-020', quantity: 1 },
    ],
  },
  {
    procedureName: 'Drenagem linfática',
    materials: [
      { sku: 'MAT-004', quantity: 1 },
      { sku: 'MAT-006', quantity: 15 },
      { sku: 'MAT-007', quantity: 1 },
      { sku: 'MAT-008', quantity: 3 },
      { sku: 'MAT-016', quantity: 5 },
    ],
  },
  {
    procedureName: 'Peeling químico',
    materials: [
      { sku: 'MAT-004', quantity: 1 },
      { sku: 'MAT-005', quantity: 3 },
      { sku: 'MAT-009', quantity: 5 },
      { sku: 'MAT-010', quantity: 5 },
      { sku: 'MAT-011', quantity: 1 },
      { sku: 'MAT-016', quantity: 10 },
      { sku: 'MAT-019', quantity: 2 },
    ],
  },
  {
    procedureName: 'Microagulhamento',
    materials: [
      { sku: 'MAT-004', quantity: 1 },
      { sku: 'MAT-012', quantity: 10 },
      { sku: 'MAT-013', quantity: 1 },
      { sku: 'MAT-014', quantity: 2 },
      { sku: 'MAT-015', quantity: 1 },
      { sku: 'MAT-016', quantity: 10 },
      { sku: 'MAT-018', quantity: 2 },
    ],
  },
];

const DEMO_DRENIAGEM_COUNT = 20;
const DEMO_DRENIAGEM_NOTE_PREFIX = 'seedDemo:drenagem-linfatica';

/** Agendamentos demo adicionais por procedimento (idempotentes via notes). */
const demoProcedureAppointments = [
  { procedureName: 'Limpeza de pele', count: 12, notePrefix: 'seedDemo:limpeza-de-pele', weekdayStart: -28 },
  { procedureName: 'Peeling químico', count: 10, notePrefix: 'seedDemo:peeling-quimico', weekdayStart: -22 },
  { procedureName: 'Microagulhamento', count: 10, notePrefix: 'seedDemo:microagulhamento', weekdayStart: -16 },
  { procedureName: 'Drenagem linfática', count: 8, notePrefix: 'seedDemo:drenagem-futuro', weekdayStart: 4 },
] as const;

/** Avança N dias úteis a partir de hoje (negativo = passado). */
function addWeekdays(from: Date, weekdays: number): Date {
  const d = new Date(from);
  const dir = weekdays >= 0 ? 1 : -1;
  let left = Math.abs(weekdays);
  while (left > 0) {
    d.setDate(d.getDate() + dir);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) left--;
  }
  return d;
}

function demoDrenagemStartAt(slotIndex: number): Date {
  return demoProcedureStartAt(-18, slotIndex);
}

function demoProcedureStartAt(weekdayStart: number, slotIndex: number): Date {
  const weekdayOffset = weekdayStart + slotIndex * 2;
  const hours = [8, 9, 10, 11, 14, 15, 16, 17];
  const d = addWeekdays(new Date(), weekdayOffset);
  d.setHours(hours[slotIndex % hours.length], (slotIndex % 3) * 20, 0, 0);
  return d;
}

function demoDrenagemStatus(startAt: Date, slotIndex: number): AppointmentStatus {
  return demoProcedureStatus(startAt, slotIndex);
}

function demoProcedureStatus(startAt: Date, slotIndex: number): AppointmentStatus {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const apptDay = new Date(startAt);
  apptDay.setHours(0, 0, 0, 0);

  if (apptDay < todayStart) {
    return slotIndex % 7 === 0 ? 'CANCELLED' : 'COMPLETED';
  }
  if (apptDay.getTime() === todayStart.getTime()) return 'CONFIRMED';
  return 'SCHEDULED';
}

async function main() {
  console.log('\n→ Garantindo grupos (roles)...');
  for (const r of defaultRoles) {
    const existing = await prisma.role.findUnique({ where: { name: r.name } });
    if (!existing) {
      await prisma.role.create({ data: r });
      console.log(`  ✓ Grupo criado: ${r.name}`);
    } else if (existing.isSystem) {
      await prisma.role.update({
        where: { id: existing.id },
        data: {
          permissions: r.permissions,
          restrictToOwnAppointments: r.restrictToOwnAppointments,
          description: r.description,
        },
      });
      console.log(`  • Grupo do sistema atualizado: ${r.name}`);
    }
  }

  console.log('\n→ Garantindo usuários...');
  for (const u of defaultUsers) {
    const role = await prisma.role.findUnique({ where: { name: u.roleName } });
    if (!role) continue;
    const exists = await prisma.user.findUnique({ where: { email: u.email } });
    if (!exists) {
      const password = await bcrypt.hash(u.password, 10);
      await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          password,
          roleId: role.id,
          providesAppointments: u.providesAppointments,
        },
      });
      console.log(`  ✓ Usuário criado: ${u.email} / ${u.password} (${u.roleName})`);
    } else {
      await prisma.user.update({
        where: { email: u.email },
        data: { providesAppointments: u.providesAppointments },
      });
      console.log(`  • Usuário já existe: ${u.email}`);
    }
  }

  console.log('\n→ Garantindo procedimentos de exemplo...');
  const procedureCount = await prisma.procedure.count();
  if (procedureCount === 0) {
    await prisma.procedure.createMany({
      data: [
        { name: 'Limpeza de pele', durationMinutes: 60, price: 150.0, recurrenceDays: 30 },
        { name: 'Drenagem linfática', durationMinutes: 50, price: 120.0, recurrenceDays: 15 },
        { name: 'Peeling químico', durationMinutes: 45, price: 250.0, recurrenceDays: 45 },
        { name: 'Microagulhamento', durationMinutes: 90, price: 350.0, recurrenceDays: 30 },
      ],
    });
    console.log('  ✓ Procedimentos criados.');
  } else {
    console.log('  • Procedimentos já existem, pulando.');
  }

  console.log('\n→ Materiais de estoque e vínculos com procedimentos...');
  for (const item of demoInventoryItems) {
    const existing = await prisma.inventoryItem.findUnique({ where: { sku: item.sku } });
    if (existing) {
      console.log(`  • Material já existe: ${item.name}`);
      continue;
    }
    await prisma.inventoryItem.create({
      data: {
        sku: item.sku,
        name: item.name,
        description: 'description' in item ? item.description : undefined,
        unit: item.unit,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        costPrice: item.costPrice,
      },
    });
    console.log(`  ✓ Material criado: ${item.name}`);
  }

  for (const link of demoProcedureMaterials) {
    const procedure = await prisma.procedure.findFirst({ where: { name: link.procedureName } });
    if (!procedure) {
      console.log(`  • Procedimento não encontrado: ${link.procedureName}`);
      continue;
    }

    const existingLinks = await prisma.procedureMaterial.count({ where: { procedureId: procedure.id } });
    if (existingLinks > 0) {
      console.log(`  • ${link.procedureName} já possui materiais vinculados, pulando.`);
      continue;
    }

    let linked = 0;
    for (const m of link.materials) {
      const inventoryItem = await prisma.inventoryItem.findUnique({ where: { sku: m.sku } });
      if (!inventoryItem) {
        console.log(`  • Item ${m.sku} não encontrado para ${link.procedureName}`);
        continue;
      }
      await prisma.procedureMaterial.create({
        data: {
          procedureId: procedure.id,
          itemId: inventoryItem.id,
          quantity: m.quantity,
        },
      });
      linked++;
    }
    console.log(`  ✓ ${link.procedureName}: ${linked} material(is) vinculado(s).`);
  }

  console.log('\n→ Garantindo templates de mensagem...');
  for (const t of defaultTemplates) {
    const exists = await prisma.messageTemplate.findUnique({ where: { name: t.name } });
    if (!exists) {
      await prisma.messageTemplate.create({ data: t });
      console.log(`  ✓ Template criado: ${t.name}`);
    }
  }

  console.log('\n→ Despesas recorrentes de exemplo...');
  for (const re of defaultRecurringExpenses) {
    const exists = await prisma.recurringExpense.findFirst({ where: { name: re.name } });
    if (!exists) {
      await prisma.recurringExpense.create({ data: { ...re, active: true } });
      console.log(`  ✓ Despesa recorrente: ${re.name}`);
    } else {
      console.log(`  • Já cadastrada: ${re.name}`);
    }
  }

  // Pacientes: rode separadamente com `npm run prisma:seed-patients`

  console.log('\n→ Agendamentos demo — Drenagem linfática...');
  const drenagemProcedure = await prisma.procedure.findFirst({
    where: { name: 'Drenagem linfática' },
  });
  const drenagemProfessional = await prisma.user.findUnique({
    where: { email: 'profissional@mila.com' },
  });
  const drenagemPatients = await prisma.patient.findMany({
    take: DEMO_DRENIAGEM_COUNT,
    orderBy: { createdAt: 'asc' },
  });

  if (!drenagemProcedure || !drenagemProfessional) {
    console.log('  • Procedimento ou profissional não encontrado, pulando agendamentos.');
  } else if (drenagemPatients.length === 0) {
    console.log('  • Nenhum paciente cadastrado — rode `npm run prisma:seed-patients` antes.');
  } else {
    const durationMs = drenagemProcedure.durationMinutes * 60 * 1000;
    let created = 0;

    for (let i = 0; i < DEMO_DRENIAGEM_COUNT; i++) {
      const note = `${DEMO_DRENIAGEM_NOTE_PREFIX}:${String(i + 1).padStart(2, '0')}`;
      const exists = await prisma.appointment.findFirst({ where: { notes: note } });
      if (exists) continue;

      const patient = drenagemPatients[i % drenagemPatients.length];
      const startAt = demoDrenagemStartAt(i);
      const endAt = new Date(startAt.getTime() + durationMs);
      const status = demoDrenagemStatus(startAt, i);

      await prisma.appointment.create({
        data: {
          patientId: patient.id,
          procedureId: drenagemProcedure.id,
          professionalId: drenagemProfessional.id,
          startAt,
          endAt,
          status,
          kind: 'PROCEDURE',
          notes: note,
        },
      });
      created++;
      console.log(
        `  ✓ ${patient.name} — ${startAt.toLocaleDateString('pt-BR')} ${startAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (${status})`,
      );
    }

    if (created === 0) {
      console.log(`  • ${DEMO_DRENIAGEM_COUNT} agendamentos de drenagem já existem, pulando.`);
    }
  }

  console.log('\n→ Agendamentos demo — demais procedimentos...');
  const demoProfessional = await prisma.user.findUnique({
    where: { email: 'profissional@mila.com' },
  });
  const demoPatients = await prisma.patient.findMany({
    orderBy: { createdAt: 'asc' },
  });

  if (!demoProfessional) {
    console.log('  • Profissional não encontrado, pulando agendamentos extras.');
  } else if (demoPatients.length === 0) {
    console.log('  • Nenhum paciente cadastrado — rode `npm run prisma:seed-patients` antes.');
  } else {
    for (const cfg of demoProcedureAppointments) {
      const procedure = await prisma.procedure.findFirst({ where: { name: cfg.procedureName } });
      if (!procedure) {
        console.log(`  • Procedimento não encontrado: ${cfg.procedureName}`);
        continue;
      }

      const durationMs = procedure.durationMinutes * 60 * 1000;
      let createdForProcedure = 0;

      for (let i = 0; i < cfg.count; i++) {
        const note = `${cfg.notePrefix}:${String(i + 1).padStart(2, '0')}`;
        const exists = await prisma.appointment.findFirst({ where: { notes: note } });
        if (exists) continue;

        const patient = demoPatients[i % demoPatients.length];
        const startAt = demoProcedureStartAt(cfg.weekdayStart, i);
        const endAt = new Date(startAt.getTime() + durationMs);
        const status = demoProcedureStatus(startAt, i);

        await prisma.appointment.create({
          data: {
            patientId: patient.id,
            procedureId: procedure.id,
            professionalId: demoProfessional.id,
            startAt,
            endAt,
            status,
            kind: 'PROCEDURE',
            notes: note,
          },
        });
        createdForProcedure++;
      }

      if (createdForProcedure === 0) {
        console.log(`  • ${cfg.procedureName}: ${cfg.count} agendamentos já existem, pulando.`);
      } else {
        console.log(`  ✓ ${cfg.procedureName}: ${createdForProcedure} agendamento(s) criado(s).`);
      }
    }
  }

  console.log('\n→ Formas de pagamento...');
  const defaultPaymentMethods = [
    { name: 'Dinheiro', feePercent: 0 },
    { name: 'PIX', feePercent: 0 },
    { name: 'Débito', feePercent: 1.39 },
    { name: 'Crédito à vista', feePercent: 3.19 },
    { name: 'Crédito parcelado', feePercent: 4.99 },
  ];

  for (const pm of defaultPaymentMethods) {
    const exists = await prisma.paymentMethod.findUnique({ where: { name: pm.name } });
    if (!exists) {
      await prisma.paymentMethod.create({ data: { name: pm.name, feePercent: pm.feePercent, active: true } });
      console.log(`  ✓ Forma de pagamento criada: ${pm.name} (taxa ${pm.feePercent}%)`);
    } else {
      console.log(`  • Já existe: ${pm.name}`);
    }
  }

  console.log('\nSeed concluído.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
