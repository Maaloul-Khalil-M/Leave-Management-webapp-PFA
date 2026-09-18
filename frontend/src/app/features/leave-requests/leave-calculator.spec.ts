import { describe, it, expect } from 'vitest';
import {
  calculateWorkingDays,
  calculateCalendarDays,
  calculateLeaveDuration,
  formatDisplayDate,
} from './leave-calculator';

describe('leave-calculator', () => {
  describe('calculateWorkingDays', () => {
    it('should return 0 when start or end date is missing', () => {
      expect(calculateWorkingDays('', '')).toBe(0);
      expect(calculateWorkingDays('2026-09-01', '')).toBe(0);
    });

    it('should return 0 when end date is before start date', () => {
      expect(calculateWorkingDays('2026-09-10', '2026-09-05')).toBe(0);
    });

    it('should calculate working days excluding weekends', () => {
      // 2026-09-14 is Monday, 2026-09-18 is Friday (5 working days)
      expect(calculateWorkingDays('2026-09-14', '2026-09-18')).toBe(5);

      // 2026-09-14 (Mon) to 2026-09-20 (Sun) is 5 working days
      expect(calculateWorkingDays('2026-09-14', '2026-09-20')).toBe(5);

      // 2026-09-19 (Sat) to 2026-09-20 (Sun) is 0 working days
      expect(calculateWorkingDays('2026-09-19', '2026-09-20')).toBe(0);
    });

    it('should handle single day half day requests', () => {
      // Single working day: Mon 2026-09-14
      expect(calculateWorkingDays('2026-09-14', '2026-09-14', true, false)).toBe(0.5);
      expect(calculateWorkingDays('2026-09-14', '2026-09-14', false, true)).toBe(0.5);
      expect(calculateWorkingDays('2026-09-14', '2026-09-14', false, false)).toBe(1);
    });

    it('should handle multi-day half day deductions', () => {
      // Mon to Wed = 3 days; start half day = 2.5 days
      expect(calculateWorkingDays('2026-09-14', '2026-09-16', true, false)).toBe(2.5);
      // Mon to Wed = 3 days; start & end half day = 2 days
      expect(calculateWorkingDays('2026-09-14', '2026-09-16', true, true)).toBe(2);
    });
  });

  describe('calculateCalendarDays', () => {
    it('should return 0 when dates are missing or invalid', () => {
      expect(calculateCalendarDays('', '')).toBe(0);
      expect(calculateCalendarDays('2026-10-02', '')).toBe(0);
      expect(calculateCalendarDays('2026-10-05', '2026-10-02')).toBe(0);
    });

    it('should calculate all calendar days including weekends', () => {
      // Friday 2026-10-02 to Monday 2026-10-05: Fri, Sat, Sun, Mon = 4 days
      expect(calculateCalendarDays('2026-10-02', '2026-10-05')).toBe(4);

      // Saturday 2026-10-03 to Sunday 2026-10-04 = 2 days
      expect(calculateCalendarDays('2026-10-03', '2026-10-04')).toBe(2);
    });

    it('should handle single calendar day requests', () => {
      expect(calculateCalendarDays('2026-10-02', '2026-10-02')).toBe(1);
      expect(calculateCalendarDays('2026-10-02', '2026-10-02', true, false)).toBe(0.5);
      expect(calculateCalendarDays('2026-10-02', '2026-10-02', false, true)).toBe(0.5);
    });

    it('should handle multi-day half day deductions for calendar days', () => {
      // Fri to Mon = 4 days; halfDayStart = 3.5 days
      expect(calculateCalendarDays('2026-10-02', '2026-10-05', true, false)).toBe(3.5);
      // Fri to Mon = 4 days; halfDayEnd = 3.5 days
      expect(calculateCalendarDays('2026-10-02', '2026-10-05', false, true)).toBe(3.5);
      // Fri to Mon = 4 days; halfDayStart & halfDayEnd = 3.0 days
      expect(calculateCalendarDays('2026-10-02', '2026-10-05', true, true)).toBe(3);
    });
  });

  describe('calculateLeaveDuration (Backend Parity)', () => {
    it('matches backend LeaveRequestServiceDurationTest behavior', () => {
      // Friday 2026-10-02 to Monday 2026-10-05
      const fri = '2026-10-02';
      const mon = '2026-10-05';

      // PAID_ANNUAL uses WORKING_DAY -> Fri + Mon = 2 working days
      expect(calculateLeaveDuration(fri, mon, 'WORKING_DAY')).toBe(2);

      // SICK uses CALENDAR_DAY -> Fri, Sat, Sun, Mon = 4 calendar days
      expect(calculateLeaveDuration(fri, mon, 'CALENDAR_DAY')).toBe(4);

      // SICK with halfDayStart -> 4 - 0.5 = 3.5 calendar days
      expect(calculateLeaveDuration(fri, mon, 'CALENDAR_DAY', true, false)).toBe(3.5);

      // Weekend-only sick leave -> Sat & Sun = 2 calendar days (while WORKING_DAY = 0)
      expect(calculateLeaveDuration('2026-10-03', '2026-10-04', 'CALENDAR_DAY')).toBe(2);
      expect(calculateLeaveDuration('2026-10-03', '2026-10-04', 'WORKING_DAY')).toBe(0);
    });
  });

  describe('formatDisplayDate', () => {
    it('should format display dates correctly', () => {
      expect(formatDisplayDate('2026-09-14')).toContain('Sep 14, 2026');
      expect(formatDisplayDate('')).toBe('—');
    });
  });
});
