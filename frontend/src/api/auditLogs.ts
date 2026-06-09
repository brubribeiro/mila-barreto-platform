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

export interface AuditLogPaginated {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogFilters {
  entity?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const auditLogsApi = {
  byEntity: (entity: string, entityId: string) =>
    api.get<AuditLogEntry[]>(`/audit-logs/${entity}/${entityId}`),

  findAll: (filters: AuditLogFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.append(key, String(value));
    });
    return api.get<AuditLogPaginated>(`/audit-logs?${params.toString()}`);
  },
};
