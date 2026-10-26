import { api } from './client';
import type { DocumentFile, DocumentStatus } from '../types';

export interface DocumentMetaPayload {
  name?: string;
  category?: string;
  notes?: string;
  patientId?: string;
  equipmentId?: string;
  status?: DocumentStatus;
}

export interface UpdateDocumentPayload {
  name?: string;
  category?: string | null;
  notes?: string | null;
  patientId?: string | null;
  equipmentId?: string | null;
  status?: DocumentStatus;
}

export const documentsApi = {
  list: async (filter: { patientId?: string; equipmentId?: string } = {}): Promise<DocumentFile[]> => {
    const { data } = await api.get<DocumentFile[]>('/documents', { params: filter });
    return data;
  },

  get: async (id: string): Promise<DocumentFile> => {
    const { data } = await api.get<DocumentFile>(`/documents/${id}`);
    return data;
  },

  upload: async (file: File, meta: DocumentMetaPayload): Promise<DocumentFile> => {
    const fd = new FormData();
    fd.append('file', file);
    if (meta.name) fd.append('name', meta.name);
    if (meta.category) fd.append('category', meta.category);
    if (meta.notes) fd.append('notes', meta.notes);
    if (meta.patientId) fd.append('patientId', meta.patientId);
    if (meta.equipmentId) fd.append('equipmentId', meta.equipmentId);
    if (meta.status) fd.append('status', meta.status);
    const { data } = await api.post<DocumentFile>('/documents/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  createFromTemplate: async (templateId: string, meta: DocumentMetaPayload): Promise<DocumentFile> => {
    const { data } = await api.post<DocumentFile>('/documents/from-template', { templateId, ...meta });
    return data;
  },

  update: async (id: string, payload: UpdateDocumentPayload): Promise<DocumentFile> => {
    const { data } = await api.patch<DocumentFile>(`/documents/${id}`, payload);
    return data;
  },

  /** Anexa/substitui o arquivo (ex.: versão assinada); o documento passa a Assinado. */
  attachFile: async (id: string, file: File): Promise<DocumentFile> => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post<DocumentFile>(`/documents/${id}/file`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },

  getAccessUrl: async (id: string): Promise<string> => {
    const { data } = await api.get<{ url: string }>(`/documents/${id}/access-url`);
    return data.url;
  },
};
