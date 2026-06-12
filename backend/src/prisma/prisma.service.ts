import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

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

  if (pooled.includes('-pooler.')) {
    return pooled.replace('-pooler.', '.');
  }

  return pooled;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

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

  /**
   * Wrapper de $transaction com retry automático.
   * Tenta novamente em caso de P2028 (cold start do Neon) ou erros de conexão.
   */
  async $transactionWithRetry<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.$transaction(fn, options);
      } catch (error) {
        lastError = error;
        const isRetryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2028' || error.code === 'P2034');
        const isConnectionError =
          error instanceof Prisma.PrismaClientInitializationError ||
          error instanceof Prisma.PrismaClientRustPanicError;

        if ((isRetryable || isConnectionError) && attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * attempt;
          this.logger.warn(
            `Transação falhou (tentativa ${attempt}/${MAX_RETRIES}), retentando em ${delay}ms...`,
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }
}
