import { describe, it, expect } from 'vitest';

import {
  ANAMNESIS_MULTILINE_KEYS,
  ANAMNESIS_SECTIONS,
  createEmptyAnamnesis,
  hasAnamnesisData,
  mergeAnamnesis,
} from './anamnesisFields';

describe('anamnesisFields', () => {
  describe('ANAMNESIS_SECTIONS', () => {
    it('should define all expected sections', () => {
      expect(ANAMNESIS_SECTIONS.map((section) => section.title)).toEqual([
        'Saúde geral',
        'Pele e estética',
        'Queixas e expectativas',
      ]);
    });

    it('should use unique field keys across sections', () => {
      const keys = ANAMNESIS_SECTIONS.flatMap((section) => section.fields.map((field) => field.key));
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe('ANAMNESIS_MULTILINE_KEYS', () => {
    it('should include complaint and expectation fields', () => {
      expect(ANAMNESIS_MULTILINE_KEYS.has('queixaPrincipal')).toBe(true);
      expect(ANAMNESIS_MULTILINE_KEYS.has('expectativas')).toBe(true);
      expect(ANAMNESIS_MULTILINE_KEYS.has('observacoesAnamnese')).toBe(true);
    });
  });

  describe('createEmptyAnamnesis', () => {
    it('should initialize booleans as false and text/select as empty string', () => {
      const empty = createEmptyAnamnesis();

      expect(empty.gestante).toBe(false);
      expect(empty.acneAtiva).toBe(false);
      expect(empty.doencasCronicas).toBe('');
      expect(empty.tabagismo).toBe('');
      expect(empty.queixaPrincipal).toBe('');
    });

    it('should include every field defined in sections', () => {
      const empty = createEmptyAnamnesis();
      const expectedKeys = ANAMNESIS_SECTIONS.flatMap((section) =>
        section.fields.map((field) => field.key),
      );

      expect(Object.keys(empty).sort()).toEqual(expectedKeys.sort());
    });
  });

  describe('mergeAnamnesis', () => {
    it('should merge existing values over defaults', () => {
      const merged = mergeAnamnesis({
        gestante: true,
        queixaPrincipal: 'Manchas na face',
        tabagismo: 'Não',
      });

      expect(merged.gestante).toBe(true);
      expect(merged.queixaPrincipal).toBe('Manchas na face');
      expect(merged.tabagismo).toBe('Não');
      expect(merged.lactante).toBe(false);
      expect(merged.medicamentosEmUso).toBe('');
    });

    it('should return empty defaults when existing is null or undefined', () => {
      expect(mergeAnamnesis(null)).toEqual(createEmptyAnamnesis());
      expect(mergeAnamnesis(undefined)).toEqual(createEmptyAnamnesis());
    });
  });

  describe('hasAnamnesisData', () => {
    it('should return false for empty, null or all-default values', () => {
      expect(hasAnamnesisData(null)).toBe(false);
      expect(hasAnamnesisData(undefined)).toBe(false);
      expect(hasAnamnesisData({})).toBe(false);
      expect(hasAnamnesisData(createEmptyAnamnesis())).toBe(false);
      expect(hasAnamnesisData({ gestante: false, doencasCronicas: '' })).toBe(false);
    });

    it('should return true when any text/select field is filled', () => {
      expect(hasAnamnesisData({ tabagismo: 'Não' })).toBe(true);
      expect(hasAnamnesisData({ queixaPrincipal: 'Acne ativa' })).toBe(true);
    });

    it('should return true when any boolean field is true', () => {
      expect(hasAnamnesisData({ gestante: true })).toBe(true);
      expect(hasAnamnesisData({ usaAnticoagulante: true })).toBe(true);
    });
  });
});
