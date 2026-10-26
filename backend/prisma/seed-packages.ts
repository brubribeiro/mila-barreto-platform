/**
 * Cria pacotes de demonstração (≥12).
 * Uso: npm run prisma:seed-packages
 */
import { randomUUID } from 'crypto';
import { PackageType } from '@prisma/client';
import { createScriptClient, runInScriptTenant } from './tenant-script';
import { TenantContext } from '../src/tenancy/tenant-context';

const prisma = createScriptClient();

type PackageItemSeed = {
  procedureName: string;
  quantity: number;
};

type PackageSeed = {
  name: string;
  description: string;
  type: PackageType;
  totalPrice: number;
  validityDays?: number;
  active?: boolean;
  items: PackageItemSeed[];
};

const demoPackages: PackageSeed[] = [
  {
    name: 'Pacote 3x Drenagem linfática',
    description: 'Três sessões de drenagem com validade de 90 dias.',
    type: PackageType.SESSIONS,
    totalPrice: 299,
    validityDays: 90,
    items: [{ procedureName: 'Drenagem linfática', quantity: 3 }],
  },
  {
    name: 'Pacote 8x Drenagem linfática',
    description: 'Oito sessões de drenagem — ideal para tratamento contínuo.',
    type: PackageType.SESSIONS,
    totalPrice: 820,
    validityDays: 180,
    items: [{ procedureName: 'Drenagem linfática', quantity: 8 }],
  },
  {
    name: 'Pacote 3x Limpeza de pele',
    description: 'Três limpezas de pele profunda.',
    type: PackageType.SESSIONS,
    totalPrice: 399,
    validityDays: 120,
    items: [{ procedureName: 'Limpeza de pele', quantity: 3 }],
  },
  {
    name: 'Pacote 5x Limpeza de pele',
    description: 'Cinco sessões de limpeza com desconto progressivo.',
    type: PackageType.SESSIONS,
    totalPrice: 620,
    validityDays: 180,
    items: [{ procedureName: 'Limpeza de pele', quantity: 5 }],
  },
  {
    name: 'Pacote 4x Peeling químico',
    description: 'Quatro peelings químicos supervisionados.',
    type: PackageType.SESSIONS,
    totalPrice: 850,
    validityDays: 150,
    items: [{ procedureName: 'Peeling químico', quantity: 4 }],
  },
  {
    name: 'Pacote 3x Microagulhamento',
    description: 'Três sessões de microagulhamento facial.',
    type: PackageType.SESSIONS,
    totalPrice: 890,
    validityDays: 180,
    items: [{ procedureName: 'Microagulhamento', quantity: 3 }],
  },
  {
    name: 'Combo Detox — Limpeza + Drenagem',
    description: 'Uma limpeza de pele e duas drenagens linfáticas.',
    type: PackageType.COMBO,
    totalPrice: 349,
    validityDays: 120,
    items: [
      { procedureName: 'Limpeza de pele', quantity: 1 },
      { procedureName: 'Drenagem linfática', quantity: 2 },
    ],
  },
  {
    name: 'Combo Pele Radiante',
    description: 'Limpeza de pele + peeling químico.',
    type: PackageType.COMBO,
    totalPrice: 349,
    validityDays: 90,
    items: [
      { procedureName: 'Limpeza de pele', quantity: 1 },
      { procedureName: 'Peeling químico', quantity: 1 },
    ],
  },
  {
    name: 'Combo Anti-idade',
    description: 'Microagulhamento + peeling para rejuvenescimento.',
    type: PackageType.COMBO,
    totalPrice: 520,
    validityDays: 120,
    items: [
      { procedureName: 'Microagulhamento', quantity: 1 },
      { procedureName: 'Peeling químico', quantity: 1 },
    ],
  },
  {
    name: 'Combo Estética Completa',
    description: 'Um de cada procedimento principal da clínica.',
    type: PackageType.COMBO,
    totalPrice: 799,
    validityDays: 180,
    items: [
      { procedureName: 'Limpeza de pele', quantity: 1 },
      { procedureName: 'Drenagem linfática', quantity: 1 },
      { procedureName: 'Peeling químico', quantity: 1 },
      { procedureName: 'Microagulhamento', quantity: 1 },
    ],
  },
  {
    name: 'Combo Verão — Drenagem intensiva',
    description: 'Três drenagens + duas limpezas para o verão.',
    type: PackageType.COMBO,
    totalPrice: 549,
    validityDays: 120,
    items: [
      { procedureName: 'Drenagem linfática', quantity: 3 },
      { procedureName: 'Limpeza de pele', quantity: 2 },
    ],
  },
  {
    name: 'Combo Noiva',
    description: 'Preparação completa: limpezas, peeling e microagulhamento.',
    type: PackageType.COMBO,
    totalPrice: 699,
    validityDays: 150,
    items: [
      { procedureName: 'Limpeza de pele', quantity: 2 },
      { procedureName: 'Peeling químico', quantity: 1 },
      { procedureName: 'Microagulhamento', quantity: 1 },
    ],
  },
  {
    name: 'Pacote 6x Drenagem — mais vendido',
    description: 'Seis sessões de drenagem com melhor custo-benefício.',
    type: PackageType.SESSIONS,
    totalPrice: 620,
    validityDays: 180,
    items: [{ procedureName: 'Drenagem linfática', quantity: 6 }],
  },
  {
    name: 'Pacote 2x Peeling + 2x Limpeza',
    description: 'Alternância sugerida de limpeza e peeling.',
    type: PackageType.COMBO,
    totalPrice: 720,
    validityDays: 150,
    items: [
      { procedureName: 'Limpeza de pele', quantity: 2 },
      { procedureName: 'Peeling químico', quantity: 2 },
    ],
  },
];

function sessionCountFromItems(items: { quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

async function packageExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM packages WHERE name = ${name} AND "tenantId" = ${TenantContext.requireTenantId()} LIMIT 1
  `;
  return rows.length > 0;
}

async function resolveItems(items: PackageItemSeed[]) {
  const resolved: { procedureId: string; quantity: number; sortOrder: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM procedures WHERE name = ${item.procedureName} AND "tenantId" = ${TenantContext.requireTenantId()} LIMIT 1
    `;
    const procedureId = rows[0]?.id;
    if (!procedureId) return null;
    resolved.push({
      procedureId,
      quantity: item.quantity,
      sortOrder: i,
    });
  }
  return resolved;
}

async function createPackage(
  pkg: PackageSeed,
  items: { procedureId: string; quantity: number; sortOrder: number }[],
) {
  const packageId = randomUUID();
  const sessionCount = sessionCountFromItems(items);
  const active = pkg.active ?? true;

  await prisma.$executeRaw`
    INSERT INTO packages (
      id, "tenantId", name, description, type, "totalPrice", "validityDays", "sessionCount", active, "createdAt", "updatedAt"
    ) VALUES (
      ${packageId},
      ${TenantContext.requireTenantId()},
      ${pkg.name},
      ${pkg.description},
      ${pkg.type}::"PackageType",
      ${pkg.totalPrice},
      ${pkg.validityDays ?? null},
      ${sessionCount},
      ${active},
      NOW(),
      NOW()
    )
  `;

  for (const item of items) {
    const itemId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO package_items (id, "tenantId", "packageId", "procedureId", quantity, "sortOrder")
      VALUES (${itemId}, ${TenantContext.requireTenantId()}, ${packageId}, ${item.procedureId}, ${item.quantity}, ${item.sortOrder})
    `;
  }
}

async function main() {
  console.log('\n→ Pacotes de demonstração...\n');

  let created = 0;
  let skipped = 0;

  for (const pkg of demoPackages) {
    if (await packageExists(pkg.name)) {
      console.log(`  • Já existe: ${pkg.name}`);
      skipped++;
      continue;
    }

    const items = await resolveItems(pkg.items);
    if (!items || items.length === 0) {
      console.log(`  • Procedimentos não encontrados, pulando: ${pkg.name}`);
      skipped++;
      continue;
    }

    await createPackage(pkg, items);
    console.log(`  ✓ ${pkg.name} — R$ ${pkg.totalPrice.toFixed(2)}`);
    created++;
  }

  console.log(`\nConcluído: ${created} criado(s), ${skipped} já existente(s)/pulado(s).\n`);
}

runInScriptTenant(prisma, main)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
