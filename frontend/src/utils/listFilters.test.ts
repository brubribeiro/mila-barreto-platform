import { describe, it, expect } from 'vitest';
import {
  normalizeSearch,
  matchesSearch,
  matchFields,
  matchesActiveFilter,
  isPromotionActive,
  getPromotionStatusKey,
} from './listFilters';

describe('listFilters', () => {
  describe('normalizeSearch', () => {
    it('should trim and lowercase', () => {
      expect(normalizeSearch('  Hello World  ')).toBe('hello world');
    });
  });

  describe('matchesSearch', () => {
    it('should return true for empty query', () => {
      expect(matchesSearch('anything', '')).toBe(true);
      expect(matchesSearch('anything', '  ')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(matchesSearch('João Silva', 'joão')).toBe(true);
      expect(matchesSearch('João Silva', 'SILVA')).toBe(true);
    });

    it('should return false for no match', () => {
      expect(matchesSearch('João', 'Maria')).toBe(false);
    });
  });

  describe('matchFields', () => {
    it('should match any of the provided fields', () => {
      expect(matchFields('test', 'testing', null, undefined)).toBe(true);
      expect(matchFields('test', null, undefined, 'no match')).toBe(false);
    });

    it('should return true for empty query', () => {
      expect(matchFields('', null, undefined)).toBe(true);
    });
  });

  describe('matchesActiveFilter', () => {
    it('should return true for ALL', () => {
      expect(matchesActiveFilter(true, 'ALL')).toBe(true);
      expect(matchesActiveFilter(false, 'ALL')).toBe(true);
    });

    it('should filter by ACTIVE/INACTIVE', () => {
      expect(matchesActiveFilter(true, 'ACTIVE')).toBe(true);
      expect(matchesActiveFilter(false, 'ACTIVE')).toBe(false);
      expect(matchesActiveFilter(false, 'INACTIVE')).toBe(true);
    });
  });

  describe('isPromotionActive', () => {
    it('should return false when promo.active is false', () => {
      const promo = {
        active: false,
        startAt: '2020-01-01',
        endAt: '2099-12-31',
      } as any;
      expect(isPromotionActive(promo)).toBe(false);
    });

    it('should return true when within date range', () => {
      const promo = {
        active: true,
        startAt: '2020-01-01',
        endAt: '2099-12-31',
      } as any;
      expect(isPromotionActive(promo)).toBe(true);
    });

    it('should return false when outside date range', () => {
      const promo = {
        active: true,
        startAt: '2099-01-01',
        endAt: '2099-12-31',
      } as any;
      expect(isPromotionActive(promo)).toBe(false);
    });
  });

  describe('getPromotionStatusKey', () => {
    it('should return ACTIVE for current promotions', () => {
      const promo = { active: true, startAt: '2020-01-01', endAt: '2099-12-31' } as any;
      expect(getPromotionStatusKey(promo)).toBe('ACTIVE');
    });

    it('should return FUTURE for upcoming active promotions', () => {
      const promo = { active: true, startAt: '2099-01-01', endAt: '2099-12-31' } as any;
      expect(getPromotionStatusKey(promo)).toBe('FUTURE');
    });

    it('should return INACTIVE when active is false', () => {
      const promo = { active: false, startAt: '2020-01-01', endAt: '2099-12-31' } as any;
      expect(getPromotionStatusKey(promo)).toBe('INACTIVE');
    });

    it('should return EXPIRED for past active promotions', () => {
      const promo = { active: true, startAt: '2020-01-01', endAt: '2020-12-31' } as any;
      expect(getPromotionStatusKey(promo)).toBe('EXPIRED');
    });
  });
});
