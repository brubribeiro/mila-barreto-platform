import { describe, it, expect } from 'vitest';
import { onlyDigits, maskCPF, maskPhone, maskCEP, isValidCPF } from './masks';

describe('masks', () => {
  describe('onlyDigits', () => {
    it('should remove all non-digit chars', () => {
      expect(onlyDigits('(11) 99999-0000')).toBe('11999990000');
      expect(onlyDigits('abc123')).toBe('123');
      expect(onlyDigits('')).toBe('');
    });
  });

  describe('maskCPF', () => {
    it('should format partial CPF', () => {
      expect(maskCPF('123')).toBe('123');
      expect(maskCPF('1234')).toBe('123.4');
      expect(maskCPF('1234567')).toBe('123.456.7');
      expect(maskCPF('12345678900')).toBe('123.456.789-00');
    });

    it('should limit to 11 digits', () => {
      expect(maskCPF('123456789001111')).toBe('123.456.789-00');
    });
  });

  describe('maskPhone', () => {
    it('should format partial phone', () => {
      expect(maskPhone('11')).toBe('(11');
      expect(maskPhone('119')).toBe('(11) 9');
      expect(maskPhone('11999990000')).toBe('(11) 99999-0000');
    });

    it('should return empty for empty input', () => {
      expect(maskPhone('')).toBe('');
    });
  });

  describe('maskCEP', () => {
    it('should format CEP with dash after 5 digits', () => {
      expect(maskCEP('01310')).toBe('01310');
      expect(maskCEP('01310100')).toBe('01310-100');
    });
  });

  describe('isValidCPF', () => {
    it('should validate a correct CPF', () => {
      expect(isValidCPF('529.982.247-25')).toBe(true);
      expect(isValidCPF('52998224725')).toBe(true);
    });

    it('should reject invalid CPFs', () => {
      expect(isValidCPF('000.000.000-00')).toBe(false);
      expect(isValidCPF('111.111.111-11')).toBe(false);
      expect(isValidCPF('123.456.789-00')).toBe(false);
      expect(isValidCPF('12345')).toBe(false);
    });
  });
});
