import { api } from './client';
import type {
  SkinAnswers,
  SkincareAvoided,
  SkincareGuideline,
  SkincareMoment,
  SkincareProduct,
  SkincareRoutine,
  SkincareRoutineItem,
  SkincareRule,
  SkincareRuleField,
  SkincareStep,
  SkincareTag,
} from '../types';

export interface SkincareProductPayload {
  name: string;
  brand?: string | null;
  activeIngredient?: string | null;
  moments: SkincareMoment[];
  step: SkincareStep;
  tags: SkincareTag[];
  howTo?: string | null;
  note?: string | null;
}

export interface SkincareRulePayload {
  field: SkincareRuleField;
  value: string;
  productIds: string[];
  avoidTags: SkincareTag[];
  note?: string | null;
}

export interface SkincareRoutinePayload {
  patientId: string;
  consultDate: string;
  answers: SkinAnswers;
  items: SkincareRoutineItem[];
  avoided: SkincareAvoided[];
  guidelines: SkincareGuideline[];
  notes?: string | null;
}

export const skincareApi = {
  listProducts: async (): Promise<SkincareProduct[]> => {
    const { data } = await api.get<SkincareProduct[]>('/skincare/products');
    return data;
  },
  createProduct: async (payload: SkincareProductPayload): Promise<SkincareProduct> => {
    const { data } = await api.post<SkincareProduct>('/skincare/products', payload);
    return data;
  },
  updateProduct: async (id: string, payload: SkincareProductPayload): Promise<SkincareProduct> => {
    const { data } = await api.patch<SkincareProduct>(`/skincare/products/${id}`, payload);
    return data;
  },
  removeProduct: async (id: string): Promise<void> => {
    await api.delete(`/skincare/products/${id}`);
  },

  listRules: async (): Promise<SkincareRule[]> => {
    const { data } = await api.get<SkincareRule[]>('/skincare/rules');
    return data;
  },
  createRule: async (payload: SkincareRulePayload): Promise<SkincareRule> => {
    const { data } = await api.post<SkincareRule>('/skincare/rules', payload);
    return data;
  },
  updateRule: async (id: string, payload: SkincareRulePayload): Promise<SkincareRule> => {
    const { data } = await api.patch<SkincareRule>(`/skincare/rules/${id}`, payload);
    return data;
  },
  removeRule: async (id: string): Promise<void> => {
    await api.delete(`/skincare/rules/${id}`);
  },

  listRoutines: async (patientId?: string): Promise<SkincareRoutine[]> => {
    const { data } = await api.get<SkincareRoutine[]>('/skincare/routines', { params: { patientId } });
    return data;
  },
  createRoutine: async (payload: SkincareRoutinePayload): Promise<SkincareRoutine> => {
    const { data } = await api.post<SkincareRoutine>('/skincare/routines', payload);
    return data;
  },
  updateRoutine: async (id: string, payload: Partial<SkincareRoutinePayload>): Promise<SkincareRoutine> => {
    const { data } = await api.patch<SkincareRoutine>(`/skincare/routines/${id}`, payload);
    return data;
  },
  removeRoutine: async (id: string): Promise<void> => {
    await api.delete(`/skincare/routines/${id}`);
  },
};
