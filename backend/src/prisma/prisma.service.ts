import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Neon (e outros poolers PgBouncer) não suportam transações interativas
 * (`$transaction(async tx => ...)`) na URL pooled. Usamos conexão direta
 * ao Postgres em runtime — necessário para agendar procedimentos (dedução de estoque).
 */
function resolveDatabaseUrl(): string | undefined {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;

  const pooled = process.env.DATABASE_URL?.trim();
  if (!pooled) return undefined;

  // Neon: ep-xxx-pooler.region.aws.neon.tech → ep-xxx.region.aws.neon.tech
  if (pooled.includes('-pooler.')) {
    return pooled.replace('-pooler.', '.');
  }

  return pooled;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = resolveDatabaseUrl();
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
