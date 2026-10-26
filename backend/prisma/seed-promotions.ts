/**
 * Cria promoções de demonstração (≥10).
 * Uso: npm run prisma:seed-promotions
 */
import { DiscountType } from '@prisma/client';
import { createScriptClient, runInScriptTenant } from './tenant-script';

const prisma = createScriptClient();

function utcNoon(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

type PromoSeed = {
  name: string;
  description: string;
  commemorativeDate?: string;
  startAt: string;
  endAt: string;
  discountType: DiscountType;
  discountValue: number;
  active: boolean;
  procedureNames: string[];
};

const demoPromotions: PromoSeed[] = [
  {
    name: 'Verão 2026 — Limpeza de pele',
    description: '15% off na limpeza de pele durante o verão.',
    commemorativeDate: 'Verão',
    startAt: '2026-01-01',
    endAt: '2026-03-31',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 15,
    active: true,
    procedureNames: ['Limpeza de pele'],
  },
  {
    name: 'Drenagem em destaque',
    description: '20% de desconto em sessões avulsas de drenagem linfática.',
    startAt: '2026-07-01',
    endAt: '2026-08-31',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 20,
    active: true,
    procedureNames: ['Drenagem linfática'],
  },
  {
    name: 'Peeling químico — promo julho',
    description: 'R$ 50 de desconto no peeling químico.',
    startAt: '2026-07-01',
    endAt: '2026-07-31',
    discountType: DiscountType.FIXED,
    discountValue: 50,
    active: true,
    procedureNames: ['Peeling químico'],
  },
  {
    name: 'Microagulhamento especial',
    description: '10% off no microagulhamento facial.',
    startAt: '2026-06-01',
    endAt: '2026-09-30',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    active: true,
    procedureNames: ['Microagulhamento'],
  },
  {
    name: 'Combo limpeza + drenagem',
    description: '12% ao combinar limpeza de pele e drenagem linfática.',
    commemorativeDate: 'Dia do Cliente',
    startAt: '2026-07-15',
    endAt: '2026-08-15',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 12,
    active: true,
    procedureNames: ['Limpeza de pele', 'Drenagem linfática'],
  },
  {
    name: 'Boas-vindas — primeira visita',
    description: '10% em qualquer procedimento para novos clientes (demo).',
    startAt: '2026-01-01',
    endAt: '2026-12-31',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    active: true,
    procedureNames: [
      'Limpeza de pele',
      'Drenagem linfática',
      'Peeling químico',
      'Microagulhamento',
    ],
  },
  {
    name: 'Dia das Mães 2026',
    description: 'Mães merecem: 25% em limpeza e drenagem.',
    commemorativeDate: 'Dia das Mães',
    startAt: '2026-05-01',
    endAt: '2026-05-15',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 25,
    active: false,
    procedureNames: ['Limpeza de pele', 'Drenagem linfática'],
  },
  {
    name: 'Primavera na pele',
    description: '15% em peeling e microagulhamento na chegada da primavera.',
    commemorativeDate: 'Primavera',
    startAt: '2026-09-01',
    endAt: '2026-10-31',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 15,
    active: true,
    procedureNames: ['Peeling químico', 'Microagulhamento'],
  },
  {
    name: 'Dia do Cliente — setembro',
    description: '30% em todos os procedimentos na semana do cliente.',
    commemorativeDate: 'Dia do Cliente',
    startAt: '2026-09-10',
    endAt: '2026-09-20',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 30,
    active: true,
    procedureNames: [
      'Limpeza de pele',
      'Drenagem linfática',
      'Peeling químico',
      'Microagulhamento',
    ],
  },
  {
    name: 'Black Friday 2026',
    description: 'Maior desconto do ano — 35% em procedimentos selecionados.',
    commemorativeDate: 'Black Friday',
    startAt: '2026-11-24',
    endAt: '2026-11-30',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 35,
    active: true,
    procedureNames: ['Limpeza de pele', 'Peeling químico', 'Microagulhamento'],
  },
  {
    name: 'Outono — cuidado completo',
    description: 'R$ 40 off em limpeza de pele + peeling no outono.',
    commemorativeDate: 'Outono',
    startAt: '2026-03-15',
    endAt: '2026-06-15',
    discountType: DiscountType.FIXED,
    discountValue: 40,
    active: true,
    procedureNames: ['Limpeza de pele', 'Peeling químico'],
  },
  {
    name: 'Natal 2026 — presenteie',
    description: '20% em todos os procedimentos até o Natal.',
    commemorativeDate: 'Natal',
    startAt: '2026-12-01',
    endAt: '2026-12-24',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 20,
    active: true,
    procedureNames: [
      'Limpeza de pele',
      'Drenagem linfática',
      'Peeling químico',
      'Microagulhamento',
    ],
  },
];

async function resolveProcedureIds(names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const procedure = await prisma.procedure.findFirst({ where: { name } });
    if (procedure) ids.push(procedure.id);
  }
  return ids;
}

async function main() {
  console.log('\n→ Promoções de demonstração...\n');

  let created = 0;
  let skipped = 0;

  for (const promo of demoPromotions) {
    const exists = await prisma.promotion.findFirst({ where: { name: promo.name } });
    if (exists) {
      console.log(`  • Já existe: ${promo.name}`);
      skipped++;
      continue;
    }

    const procedureIds = await resolveProcedureIds(promo.procedureNames);

    if (procedureIds.length === 0) {
      console.log(`  • Sem procedimentos vinculados, pulando: ${promo.name}`);
      skipped++;
      continue;
    }

    await prisma.promotion.create({
      data: {
        name: promo.name,
        description: promo.description,
        commemorativeDate: promo.commemorativeDate,
        startAt: utcNoon(promo.startAt),
        endAt: utcNoon(promo.endAt),
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        active: promo.active,
        procedures: { create: procedureIds.map((procedureId) => ({ procedureId })) },
      },
    });

    console.log(`  ✓ ${promo.name}`);
    created++;
  }

  console.log(`\nConcluído: ${created} criada(s), ${skipped} já existente(s)/pulada(s).\n`);
}

runInScriptTenant(prisma, main)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
