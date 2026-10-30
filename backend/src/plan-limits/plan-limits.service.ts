import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';

const BYTES_PER_GB = 1024 ** 3;

/** Limites do plano da clínica; null = ilimitado. */
export type EffectivePlanLimits = {
  maxUsers: number | null;
  maxPatients: number | null;
  storageGb: number | null;
};

const UNLIMITED: EffectivePlanLimits = { maxUsers: null, maxPatients: null, storageGb: null };

function positiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/** Lê Plan.limits (Json). Sem plano ou sem o limite = ilimitado. */
export function resolvePlanLimits(plan: { limits?: unknown } | null | undefined): EffectivePlanLimits {
  if (!plan || !plan.limits || typeof plan.limits !== 'object') return UNLIMITED;
  const limits = plan.limits as Record<string, unknown>;
  return {
    maxUsers: positiveNumber(limits.maxUsers),
    maxPatients: positiveNumber(limits.maxPatients),
    storageGb: positiveNumber(limits.storageGb),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes >= BYTES_PER_GB) {
    return `${(bytes / BYTES_PER_GB).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`;
  }
  return `${Math.ceil(bytes / 1024 ** 2)} MB`;
}

/**
 * Limites do plano (usuários ativos, pacientes, armazenamento) da clínica da requisição.
 * Clínica sem plano não tem limite (mesma regra legada dos módulos no FeatureGuard).
 * A checagem é contagem + criação, sem trava: requisições simultâneas podem passar 1 a mais.
 */
@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLimits(): Promise<{ plan: { id: string; name: string } | null; limits: EffectivePlanLimits }> {
    const tenantId = TenantContext.requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: { select: { id: true, name: true, limits: true } } },
    });
    const plan = tenant?.plan ?? null;
    return { plan: plan ? { id: plan.id, name: plan.name } : null, limits: resolvePlanLimits(plan) };
  }

  /** Só usuários ativos ocupam vaga; super-admin da plataforma não tem clínica e não entra. */
  countActiveUsers() {
    return this.prisma.user.count({ where: { active: true } });
  }

  countPatients() {
    return this.prisma.patient.count();
  }

  /** Documentos e fotos "antes e depois" no R2 (bytes gravados no upload), como no /admin. */
  async storageBytes(): Promise<number> {
    const [documents, photos] = await Promise.all([
      this.prisma.document.aggregate({ _sum: { size: true } }),
      this.prisma.patientPhoto.aggregate({ _sum: { size: true } }),
    ]);
    return (documents._sum.size ?? 0) + (photos._sum.size ?? 0);
  }

  /** Uso atual vs limites (tela "Meu plano"). */
  async getUsage() {
    const [{ plan, limits }, users, patients, storageBytes] = await Promise.all([
      this.getLimits(),
      this.countActiveUsers(),
      this.countPatients(),
      this.storageBytes(),
    ]);
    return {
      plan,
      limits,
      usage: { users, patients, storageBytes },
      storageLimitBytes: limits.storageGb === null ? null : Math.round(limits.storageGb * BYTES_PER_GB),
    };
  }

  /** Antes de criar (ou reativar) um usuário ativo. */
  async assertCanAddUser(): Promise<void> {
    const { limits } = await this.getLimits();
    if (limits.maxUsers === null) return;
    const used = await this.countActiveUsers();
    if (used >= limits.maxUsers) {
      throw new ForbiddenException(
        `Limite do plano atingido: até ${limits.maxUsers} usuário(s) ativo(s). Desative um usuário ou fale com o suporte para ampliar o plano.`,
      );
    }
  }

  async assertCanAddPatient(): Promise<void> {
    const { limits } = await this.getLimits();
    if (limits.maxPatients === null) return;
    const used = await this.countPatients();
    if (used >= limits.maxPatients) {
      throw new ForbiddenException(
        `Limite do plano atingido: até ${limits.maxPatients} paciente(s). Fale com o suporte para ampliar o plano.`,
      );
    }
  }

  /**
   * Antes de enviar um arquivo ao R2. `replacedBytes` = tamanho do arquivo que este upload substitui
   * (ex.: versão assinada de um documento), que deixa de contar.
   */
  async assertStorageAvailable(incomingBytes: number, replacedBytes = 0): Promise<void> {
    const { limits } = await this.getLimits();
    if (limits.storageGb === null) return;
    const limitBytes = limits.storageGb * BYTES_PER_GB;
    const used = await this.storageBytes();
    if (used - replacedBytes + incomingBytes > limitBytes) {
      throw new ForbiddenException(
        `Limite de armazenamento do plano atingido: ${formatBytes(used)} de ${formatBytes(limitBytes)} usados. ` +
          'Exclua arquivos ou fale com o suporte para ampliar o plano.',
      );
    }
  }
}
