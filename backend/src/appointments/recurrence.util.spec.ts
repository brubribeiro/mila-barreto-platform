import {
  computeEarliestRecurrenceDate,
  toDateInputValue,
  isBeforeRecurrenceEarliest,
} from './recurrence.util';

describe('recurrence.util', () => {
  describe('computeEarliestRecurrenceDate', () => {
    it('should add recurrenceDays and zero out time', () => {
      const lastCompleted = new Date('2025-01-10T14:30:00Z');
      const result = computeEarliestRecurrenceDate(lastCompleted, 30);

      expect(result.getDate()).toBe(new Date('2025-02-09').getDate());
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it('should handle month overflow correctly', () => {
      const lastCompleted = new Date('2025-01-31T10:00:00Z');
      const result = computeEarliestRecurrenceDate(lastCompleted, 30);

      // Jan 31 + 30 days = Mar 2
      expect(result.getMonth()).toBe(2); // March (0-indexed)
    });
  });

  describe('toDateInputValue', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      expect(toDateInputValue(date)).toBe('2025-01-15');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date(2025, 2, 5); // Mar 5, 2025
      expect(toDateInputValue(date)).toBe('2025-03-05');
    });
  });

  describe('isBeforeRecurrenceEarliest', () => {
    it('should return true if startAt is before earliest', () => {
      const startAt = new Date('2025-01-10');
      const earliest = new Date('2025-01-20');
      expect(isBeforeRecurrenceEarliest(startAt, earliest)).toBe(true);
    });

    it('should return false if startAt equals or is after earliest', () => {
      const earliest = new Date('2025-01-20');
      expect(isBeforeRecurrenceEarliest(new Date('2025-01-20'), earliest)).toBe(false);
      expect(isBeforeRecurrenceEarliest(new Date('2025-01-25'), earliest)).toBe(false);
    });
  });
});
