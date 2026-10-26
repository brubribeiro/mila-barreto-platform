import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PlatformCatalogItem } from '@prisma/client';

import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { CreateCatalogItemDto, UpdateCatalogItemDto } from './dto/catalog.dto';
import {
  PLATFORM_CATALOG_KINDS,
  type PlatformCatalogKind,
} from './platform-catalog.constants';
import { recordPlatformAudit } from './platform-audit';

const MESSAGE_TRIGGERS = [
  'ON_BOOKING',
  'DAY_BEFORE',
  'BIRTHDAY',
  'AFTER_APPOINTMENT',
  'INACTIVE_90_DAYS',
  'MANUAL',
] as const;

/**
 * Catálogo global da plataforma: sem tenantId, todas as clínicas veem o mesmo.
 * Super-admin edita; clínicas só leem itens ativos.
 */
@Injectable()
export class CatalogsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista para o painel admin (inclui inativos). */
  listForAdmin(kind?: string) {
    return TenantContext.runUnscoped(async () => {
      const where = kind ? { kind: this.assertKind(kind) } : undefined;
      return this.prisma.platformCatalogItem.findMany({
        where,
        orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
      });
    });
  }

  getForAdmin(id: string) {
    return TenantContext.runUnscoped(() => this.findOrThrow(id));
  }

  /** Leitura autenticada do app da clínica: só ativos. */
  listActive(kind?: string) {
    return TenantContext.runUnscoped(async () => {
      const where: Prisma.PlatformCatalogItemWhereInput = { active: true };
      if (kind) where.kind = this.assertKind(kind);
      return this.prisma.platformCatalogItem.findMany({
        where,
        orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
        select: { id: true, kind: true, value: true, label: true, sortOrder: true, meta: true },
      });
    });
  }

  create(dto: CreateCatalogItemDto, actor: AuthenticatedUser) {
    return TenantContext.runUnscoped(async () => {
      const kind = this.assertKind(dto.kind);
      this.assertValueForKind(kind, dto.value);
      await this.assertValueFree(kind, dto.value);

      const item = await this.prisma.platformCatalogItem.create({
        data: {
          kind,
          value: dto.value,
          label: dto.label,
          sortOrder: dto.sortOrder ?? (await this.nextSortOrder(kind)),
          active: dto.active ?? true,
          meta: dto.meta === undefined ? undefined : dto.meta === null ? Prisma.DbNull : (dto.meta as Prisma.InputJsonValue),
        },
      });
      await this.audit(actor, 'CATALOG_CREATE', item, {
        kind: item.kind,
        value: item.value,
        label: item.label,
        sortOrder: item.sortOrder,
        ...(item.meta && typeof item.meta === 'object' ? { meta: item.meta } : {}),
      });
      return item;
    });
  }

  update(id: string, dto: UpdateCatalogItemDto, actor: AuthenticatedUser) {
    return TenantContext.runUnscoped(async () => {
      const before = await this.findOrThrow(id);
      if (dto.value && dto.value !== before.value) {
        this.assertValueForKind(before.kind as PlatformCatalogKind, dto.value);
        await this.assertValueFree(before.kind, dto.value);
      }

      const updated = await this.prisma.platformCatalogItem.update({
        where: { id },
        data: {
          ...(dto.value !== undefined ? { value: dto.value } : {}),
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.meta !== undefined
            ? { meta: dto.meta === null ? Prisma.DbNull : (dto.meta as Prisma.InputJsonValue) }
            : {}),
        },
      });

      const changes: Record<string, { old: unknown; new: unknown }> = {};
      for (const key of ['value', 'label', 'sortOrder'] as const) {
        if (before[key] !== updated[key]) changes[key] = { old: before[key], new: updated[key] };
      }
      if (JSON.stringify(before.meta) !== JSON.stringify(updated.meta)) {
        changes.meta = { old: before.meta, new: updated.meta };
      }
      if (Object.keys(changes).length) await this.audit(actor, 'CATALOG_UPDATE', updated, changes);
      return updated;
    });
  }

  setActive(id: string, active: boolean, actor: AuthenticatedUser) {
    return TenantContext.runUnscoped(async () => {
      const item = await this.findOrThrow(id);
      if (item.active === active) return item;
      const updated = await this.prisma.platformCatalogItem.update({ where: { id }, data: { active } });
      await this.audit(actor, active ? 'CATALOG_ACTIVATE' : 'CATALOG_DEACTIVATE', updated);
      return updated;
    });
  }

  private async nextSortOrder(kind: string) {
    const last = await this.prisma.platformCatalogItem.findFirst({
      where: { kind },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? -1) + 1;
  }

  private async findOrThrow(id: string): Promise<PlatformCatalogItem> {
    const item = await this.prisma.platformCatalogItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item de catálogo não encontrado.');
    return item;
  }

  private assertKind(kind: string): PlatformCatalogKind {
    if (!(PLATFORM_CATALOG_KINDS as readonly string[]).includes(kind)) {
      throw new BadRequestException(
        `Tipo inválido. Use: ${PLATFORM_CATALOG_KINDS.join(', ')}.`,
      );
    }
    return kind as PlatformCatalogKind;
  }

  private assertValueForKind(kind: PlatformCatalogKind, value: string) {
    if (kind === 'message_trigger' && !(MESSAGE_TRIGGERS as readonly string[]).includes(value)) {
      throw new BadRequestException(
        `Gatilho inválido. Use: ${MESSAGE_TRIGGERS.join(', ')}.`,
      );
    }
  }

  private async assertValueFree(kind: string, value: string) {
    if (await this.prisma.platformCatalogItem.findUnique({ where: { kind_value: { kind, value } } })) {
      throw new ConflictException(`Já existe um item "${value}" neste catálogo.`);
    }
  }

  private audit(
    actor: AuthenticatedUser,
    action: 'CATALOG_CREATE' | 'CATALOG_UPDATE' | 'CATALOG_ACTIVATE' | 'CATALOG_DEACTIVATE',
    item: PlatformCatalogItem,
    details?: Record<string, unknown>,
  ) {
    return recordPlatformAudit(
      this.prisma,
      actor,
      action,
      { tenantId: null, name: `${item.kind}:${item.label}` },
      { catalogItemId: item.id, kind: item.kind, value: item.value, ...details },
    );
  }
}
