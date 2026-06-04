import { api } from './client';

export interface AppointmentMetrics {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  scheduled: number;
  confirmed: number;
  completionRate: number;
  noShowRate: number;
  cancellationRate: number;
  byProfessional: { name: string; total: number; completed: number }[];
  byProcedure: { name: string; total: number; revenue: number }[];
  procedureCombos: { procedures: string; count: number }[];
  byDayOfWeek: { day: number; total: number }[];
  byHour: { hour: number; total: number }[];
}

export interface PatientMetrics {
  totalActive: number;
  newInPeriod: number;
  returningInPeriod: number;
  uniqueInPeriod: number;
  averageAge: number | null;
  averageProceduresPerPatient: number;
  topPatients: { name: string; appointments: number }[];
  topLocations: { location: string; count: number }[];
}

export interface ProcedureMetrics {
  totalCatalog: number;
  activeCatalog: number;
  totalPerformed: number;
  uniquePerformed: number;
  averageDuration: number;
  averagePrice: number;
  ranking: { name: string; count: number; revenue: number; avgDuration: number }[];
  byProfessional: { procedure: string; professional: string; count: number }[];
  byMonth: { month: string; count: number }[];
  materialCost: { name: string; baseCost: number; price: number; margin: number }[];
  averageRealDuration: number | null;
  durationByProcedure: { name: string; avgMinutes: number; count: number }[];
  durationByProfessional: { name: string; avgMinutes: number; count: number }[];
}

export interface PackageMetrics {
  totalSold: number;
  totalRevenue: number;
  activeCount: number;
  completedCount: number;
  sessionsUsed: number;
  sessionsTotal: number;
  completionRate: number;
  topPackages: { name: string; sold: number; revenue: number }[];
}

export interface MetricsResult {
  appointments: AppointmentMetrics;
  patients: PatientMetrics;
  procedures: ProcedureMetrics;
  packages: PackageMetrics;
}

export const metricsApi = {
  get: async (from: string, to: string): Promise<MetricsResult> => {
    const { data } = await api.get<MetricsResult>('/metrics', {
      params: { from, to },
    });
    return data;
  },
};
