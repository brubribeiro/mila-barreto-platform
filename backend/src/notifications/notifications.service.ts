import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ADMIN_ROLE_NAME } from '../common/permissions';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma notificação respeitando a preferência do usuário.
   * Se o usuário desabilitou esse tipo, a notificação não é criada.
   * Falhas aqui não devem quebrar a operação principal — o caller deve
   * envolver em try/catch ou usar `.catch(() => null)`.
   */
  async notify(input: CreateNotificationInput) {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId: input.userId, type: input.type } },
    });
    // Se existe registro de preferência e está desabilitado, pula
    if (pref && !pref.enabled) return null;

    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        metadata: input.metadata,
      },
    });
  }

  /** Notifica múltiplos usuários (dispara em paralelo, falhas silenciosas). */
  async notifyMany(userIds: string[], data: Omit<CreateNotificationInput, 'userId'>) {
    await Promise.allSettled(
      userIds.map((userId) => this.notify({ ...data, userId })),
    );
  }

  /** Retorna usuários com determinada permissão (útil para "notificar quem pode editar X"). */
  async findUsersWithPermission(permission: string): Promise<{ id: string }[]> {
    const users = await this.prisma.user.findMany({
      where: {
        active: true,
        OR: [
          { role: { permissions: { has: permission } } },
          { role: { name: SYSTEM_ADMIN_ROLE_NAME } },
        ],
      },
      select: { id: true },
    });
    return users;
  }

  list(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    return this.prisma.notification.findMany({
      where: { userId, ...(opts.unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 50,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markAsRead(id: string, userId: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Notificação não encontrada');
    if (n.userId !== userId) throw new NotFoundException('Notificação não encontrada');
    return this.prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { ok: true };
  }

  async remove(id: string, userId: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== userId) throw new NotFoundException('Notificação não encontrada');
    await this.prisma.notification.delete({ where: { id } });
    return { ok: true };
  }

  /** Retorna preferências do usuário. Tipos sem registro são considerados habilitados. */
  async getPreferences(userId: string) {
    const prefs = await this.prisma.notificationPreference.findMany({ where: { userId } });
    const map = new Map(prefs.map((p) => [p.type, p.enabled]));
    return Object.values(NotificationType).map((type) => ({
      type,
      enabled: map.get(type) ?? true,
    }));
  }

  async setPreference(userId: string, type: NotificationType, enabled: boolean) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, enabled },
      update: { enabled },
    });
  }
}
