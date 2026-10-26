import { PrismaClient } from '@prisma/client';

import { TenantContext } from '../src/tenancy/tenant-context';
import { withTenantScope } from '../src/tenancy/tenant-scope.extension';
import { ensureSystemRoles } from '../src/tenancy/system-roles';

/** Clínica inicial (criada pela migration multi_tenant com os dados anteriores). */
export const DEFAULT_TENANT = { slug: 'mila-barreto', name: 'Mila Barreto' };

/** E-mail é único no sistema: fora da clínica padrão, os usuários demo usam @<slug>.demo. */
export function demoEmail(email: string): string {
  const slug = process.env.TENANT_SLUG?.trim();
  return slug && slug !== DEFAULT_TENANT.slug ? email.replace('@mila.com', `@${slug}.demo`) : email;
}

/** Client dos scripts de prisma/: mesmo escopo automático por clínica da API. */
export function createScriptClient(): PrismaClient {
  return withTenantScope(new PrismaClient());
}

/**
 * Roda fn no contexto da clínica TENANT_SLUG (padrão: mila-barreto).
 * Com create: true (seed principal) cria a clínica e os grupos de sistema se faltarem;
 * os demais scripts exigem que ela já exista.
 */
export async function runInScriptTenant<T>(
  prisma: PrismaClient,
  fn: (tenantId: string) => Promise<T>,
  options: { create?: boolean } = {},
): Promise<T> {
  const slug = process.env.TENANT_SLUG?.trim() || DEFAULT_TENANT.slug;
  const tenant = options.create
    ? await prisma.tenant.upsert({
        where: { slug },
        create: { slug, name: process.env.TENANT_NAME?.trim() || (slug === DEFAULT_TENANT.slug ? DEFAULT_TENANT.name : slug) },
        update: {},
      })
    : await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) throw new Error(`Clínica "${slug}" não encontrada. Rode o seed principal antes (npm run prisma:seed).`);

  console.log(`\n→ Clínica: ${tenant.name} (${tenant.slug})`);
  return TenantContext.run(tenant.id, async () => {
    if (options.create) await ensureSystemRoles(prisma, tenant.id);
    return fn(tenant.id);
  });
}
