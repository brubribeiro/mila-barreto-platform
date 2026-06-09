import { api } from './client';
import type { DocumentFile } from '../types';

export const documentsApi = {
  list: async (filter: { patientId?: string; equipmentId?: string } = {}): Promise<DocumentFile[]> => {
    const { data } = await api.get<DocumentFile[]>('/documents', { params: filter });
    return data;
  },

  upload: async (
    file: File,
    meta: { name?: string; category?: string; notes?: string; patientId?: string; equipmentId?: string },
  ): Promise<DocumentFile> => {
    const fd = new FormData();
    fd.append('file', file);
    if (meta.name) fd.append('name', meta.name);
    if (meta.category) fd.append('category', meta.category);
    if (meta.notes) fd.append('notes', meta.notes);
    if (meta.patientId) fd.append('patientId', meta.patientId);
    if (meta.equipmentId) fd.append('equipmentId', meta.equipmentId);
    const { data } = await api.post<DocumentFile>('/documents/upload', fd, {
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
