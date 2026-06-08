import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  api: {
    patch: vi.fn(),
  },
}));

import { api } from './client';
import { patientsApi } from './patients';

describe('patientsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateAnamnesis', () => {
    it('should PATCH only the anamnesis payload', async () => {
      const anamnesis = {
        gestante: true,
        queixaPrincipal: 'Manchas na face',
        tabagismo: 'Não',
      };
      const savedPatient = { id: 'patient-1', name: 'Maria Silva', anamnesis };

      vi.mocked(api.patch).mockResolvedValue({ data: savedPatient });

      const result = await patientsApi.updateAnamnesis('patient-1', anamnesis);

      expect(api.patch).toHaveBeenCalledOnce();
      expect(api.patch).toHaveBeenCalledWith('/patients/patient-1', { anamnesis });
      expect(result).toEqual(savedPatient);
    });
  });
});
