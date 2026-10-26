import {
  normalizeFeatures,
  PLATFORM_FEATURES,
  resolveEffectiveFeatures,
  tenantHasFeature,
} from './platform-features';

describe('platform-features', () => {
  describe('normalizeFeatures', () => {
    it('filtra desconhecidos, remove duplicatas e ordena pelo catálogo', () => {
      expect(normalizeFeatures(['finance', 'nope', 'patients', 'finance', 1, null])).toEqual([
        'patients',
        'finance',
      ]);
    });

    it('array inválido vira vazio', () => {
      expect(normalizeFeatures(null)).toEqual([]);
      expect(normalizeFeatures('finance')).toEqual([]);
    });
  });

  describe('resolveEffectiveFeatures', () => {
    it('sem plano devolve o catálogo inteiro (legado)', () => {
      expect(resolveEffectiveFeatures({ hasPlan: false })).toEqual([...PLATFORM_FEATURES]);
    });

    it('com plano: união com extra menos denied', () => {
      expect(
        resolveEffectiveFeatures({
          hasPlan: true,
          planFeatures: ['appointments', 'patients', 'finance'],
          featuresExtra: ['messages', 'patients'],
          featuresDenied: ['finance'],
        }),
      ).toEqual(['appointments', 'patients', 'messages']);
    });

    it('plano vazio + extra só libera o extra', () => {
      expect(
        resolveEffectiveFeatures({
          hasPlan: true,
          planFeatures: [],
          featuresExtra: ['goals'],
          featuresDenied: [],
        }),
      ).toEqual(['goals']);
    });

    it('denied em módulo que só veio do extra remove', () => {
      expect(
        resolveEffectiveFeatures({
          hasPlan: true,
          planFeatures: ['patients'],
          featuresExtra: ['metrics'],
          featuresDenied: ['metrics', 'patients'],
        }),
      ).toEqual([]);
    });
  });

  describe('tenantHasFeature', () => {
    it('consulta a lista efetiva', () => {
      expect(tenantHasFeature(['patients', 'finance'], 'finance')).toBe(true);
      expect(tenantHasFeature(['patients'], 'finance')).toBe(false);
      expect(tenantHasFeature(null, 'patients')).toBe(false);
    });
  });
});
