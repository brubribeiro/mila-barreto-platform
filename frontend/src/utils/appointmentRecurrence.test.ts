import { describe, it, expect } from 'vitest';
import {
  computeEarliestRecurrenceDate,
  isDateBeforeRecurrenceEarliest,
  formatRecurrenceEarliestLabel,
} from './appointmentRecurrence';

describe('appointmentRecurrence', () => {
  describe('computeEarliestRecurrenceDate', () => {
    it('should add recurrenceDays to last completed date', () => {
      const result = computeEarliestRecurrenceDate('2025-01-10', 30);
      expect(result).toBe('2025-02-09');
    });

    it('should handle Date input', () => {
      const result = computeEarliestRecurrenceDate(new Date('2025-03-01T14:00:00Z'), 90);
      expect(result).toBe('2025-05-30');
    });
  });

  describe('isDateBeforeRecurrenceEarliest', () => {
    it('should return true when date is before earliest', () => {
      expect(isDateBeforeRecurrenceEarliest('2025-01-15', '2025-02-09')).toBe(true);
    });

    it('should return false when date is same or after earliest', () => {
      expect(isDateBeforeRecurrenceEarliest('2025-02-09', '2025-02-09')).toBe(false);
      expect(isDateBeforeRecurrenceEarliest('2025-03-01', '2025-02-09')).toBe(false);
    });
  });

  describe('formatRecurrenceEarliestLabel', () => {
    it('should format as DD/MM/YYYY', () => {
      expect(formatRecurrenceEarliestLabel('2025-02-09')).toBe('09/02/2025');
    });
  });
});
