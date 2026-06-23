import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface AuditUser {
  id: string;
  name: string;
}

/**
 * Serviço central de auditoria.
 * Registra criação, edição e exclusão de qualquer entidade,
 * incluindo diff de campos alterados (valor anterior → novo).
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra uma criação. Grava todos os campos do registro novo.
   */
  async logCreate(entity: string, entityId: string, newData: Record<string, unknown>, user?: AuditUser) {
    const changes = this.sanitize(newData);
    await this.prisma.auditLog.create({
      data: {
        entity,
        entityId,
        action: AuditAction.CREATE,
        changes: changes as unknown as Prisma.InputJsonValue,
        userId: user?.id ?? null,
        userName: user?.name ?? null,
      },
    });
  }

  /**
   * Registra uma edição. Calcula o diff entre o registro anterior e o atual.
   * Só registra se houver campos efetivamente alterados.
   */
  async logUpdate(
    entity: string,
    entityId: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    user?: AuditUser,
  ) {
    const changes = this.diff(oldData, newData);
    if (!changes || Object.keys(changes).length === 0) return;

    await this.prisma.auditLog.create({
      data: {
        entity,
        entityId,
        action: AuditAction.UPDATE,
        changes: changes as unknown as Prisma.InputJsonValue,
        userId: user?.id ?? null,
        userName: user?.name ?? null,
      },
    });
  }

  /**
   * Registra uma exclusão. Grava o estado do registro antes de ser removido.
   */
  async logDelete(entity: string, entityId: string, oldData: Record<string, unknown>, user?: AuditUser) {
    const changes = this.sanitize(oldData);
    await this.prisma.auditLog.create({
      data: {
        entity,
        entityId,
        action: AuditAction.DELETE,
        changes: changes as unknown as Prisma.InputJsonValue,
        userId: user?.id ?? null,
        userName: user?.name ?? null,
      },
    });
  }

  /**
   * Lista logs de auditoria com filtros e paginação.
   */
  async findAll(params: {
    entity?: string;
    entityId?: string;
    userId?: string;
    action?: AuditAction;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { entity, entityId, userId, action, startDate, endDate } = params;
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Lista logs de uma entidade + entityId específicos (para exibir no detalhe do registro).
   */
  async findByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ---- helpers ----

  /**
   * Calcula diff entre dois objetos: retorna { campo: { old, new } } para cada campo alterado.
   */
  private diff(oldData: Record<string, unknown>, newData: Record<string, unknown>) {
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      if (this.isInternalField(key)) continue;
      const oldVal = oldData[key];
      const newVal = newData[key];
      if (this.isRelationValue(oldVal) || this.isRelationValue(newVal)) continue;
      if (!this.isEqual(oldVal, newVal)) {
        changes[key] = {
          old: this.resolveDisplayName(key, oldData) ?? this.serializeValue(oldVal),
          new: this.resolveDisplayName(key, newData) ?? this.serializeValue(newVal),
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /** Remove campos internos do Prisma e campos sensíveis. */
  private sanitize(data: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (this.isInternalField(key)) continue;
      out[key] = this.resolveDisplayName(key, data) ?? this.serializeValue(val);
    }
    return out;
  }

  /**
   * Para campos *Id, tenta extrair o nome legível da relação Prisma correspondente.
   * Ex: patientId → busca data['patient']?.name
   */
  private resolveDisplayName(key: string, data: Record<string, unknown>): string | undefined {
    if (!key.endsWith('Id')) return undefined;
    const relationKey = key.slice(0, -2); // patientId → patient
    const relation = data[relationKey];
    if (relation && typeof relation === 'object' && relation !== null && 'name' in relation) {
      return (relation as { name: string }).name;
    }
    return undefined;
  }

  private isInternalField(key: string): boolean {
    return [
      'password',
      'createdAt',
      'updatedAt',
      'id',
      'photoUrl',
      'fileUrl',
    ].includes(key);
  }

  private serializeValue(val: unknown): unknown {
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'bigint') return val.toString();
    if (val !== null && typeof val === 'object' && 'toNumber' in (val as Record<string, unknown>)) {
      return (val as { toNumber: () => number }).toNumber();
    }
    return val;
  }

  private isEqual(a: unknown, b: unknown): boolean {
    const sa = this.serializeValue(a);
    const sb = this.serializeValue(b);
    if (this.isEmptyValue(sa) && this.isEmptyValue(sb)) return true;
    if (sa === sb) return true;
    return JSON.stringify(sa) === JSON.stringify(sb);
  }

  /** Valores vazios equivalentes (null, undefined, string vazia). */
  private isEmptyValue(val: unknown): boolean {
    return val === null || val === undefined || val === '';
  }

  /** Relações Prisma incluídas no objeto — não são campos persistidos do registro. */
  private isRelationValue(val: unknown): boolean {
    if (val === null || val === undefined) return false;
    if (val instanceof Date) return false;
    if (Array.isArray(val)) return false;
    return typeof val === 'object';
  }
}
