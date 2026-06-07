import { api } from './client';

export interface AuditLogEntry {
  id: string;
  entity: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changes: Record<string, { old?: unknown; new?: unknown }> | null;
  userId: string | null;
  userName: string | null;
  createdAt: string;
}

export const auditLogsApi = {
  /** Busca logs de uma entidade + ID específicos (para exibir dentro do detalhe) */
  byEntity: (entity: string, entityId: string) =>
    api.get<AuditLogEntry[]>(`/audit-logs/${entity}/${entityId}`),
};
