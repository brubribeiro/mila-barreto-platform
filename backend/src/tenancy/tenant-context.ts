import { AsyncLocalStorage } from 'node:async_hooks';
import { ForbiddenException } from '@nestjs/common';

export interface TenantStore {
  /** Clínica da requisição/job atual. Null = ainda não autenticado ou super-admin. */
  tenantId: string | null;
  /** Desliga o escopo automático (login, super-admin, jobs que percorrem as clínicas). */
  unscoped?: boolean;
}

const storage = new AsyncLocalStorage<TenantStore>();

/**
 * PrismaPromise é preguiçosa: a consulta só roda no then(), que normalmente é chamado fora
 * do run(). Por isso o then() é disparado aqui dentro, ainda no contexto certo.
 */
function runIn<T>(store: TenantStore, fn: () => T): T {
  return storage.run(store, () => {
    const result = fn();
    if (result && typeof (result as { then?: unknown }).then === 'function') {
      const thenable = result as unknown as PromiseLike<unknown>;
      return new Promise((resolve, reject) => thenable.then(resolve, reject)) as T;
    }
    return result;
  });
}

/**
 * Consulta a um model de clínica sem tenant no contexto. Sai como 403 numa requisição
 * (ex.: super-admin chamando rota de clínica) e aparece no log quando é um job sem contexto.
 */
export class TenantContextMissingError extends ForbiddenException {
  constructor(model: string, operation: string) {
    super(`Esta operação exige o contexto de uma clínica (${model}.${operation}).`);
    this.name = 'TenantContextMissingError';
  }
}

/**
 * Contexto de tenant por requisição/job (AsyncLocalStorage). O client Prisma
 * (tenant-scope.extension.ts) lê daqui o tenantId para filtrar e preencher os dados.
 */
export const TenantContext = {
  /** Abre um contexto mutável vazio para a requisição; o JwtAuthGuard preenche o tenant depois. */
  runRequest<T>(fn: () => T): T {
    return storage.run({ tenantId: null }, fn);
  },

  /** Executa fn como a clínica tenantId (jobs do scheduler, seeds, testes). */
  run<T>(tenantId: string, fn: () => T): T {
    return runIn({ tenantId }, fn);
  },

  /** Executa fn sem escopo: enxerga todas as clínicas. Só para login, super-admin e jobs. */
  runUnscoped<T>(fn: () => T): T {
    return runIn({ tenantId: null, unscoped: true }, fn);
  },

  /** Define a clínica da requisição atual (chamado pelo JwtAuthGuard). */
  setTenant(tenantId: string | null): void {
    const store = storage.getStore();
    if (!store) throw new Error('TenantContext.setTenant chamado fora de um contexto de requisição.');
    store.tenantId = tenantId;
  },

  current(): TenantStore | undefined {
    return storage.getStore();
  },

  tenantId(): string | null {
    return storage.getStore()?.tenantId ?? null;
  },

  requireTenantId(): string {
    const tenantId = storage.getStore()?.tenantId;
    if (!tenantId) throw new TenantContextMissingError('tenant', 'requireTenantId');
    return tenantId;
  },
};
