import { describe, it, expect } from 'vitest';
import { calculateWorkingDays, formatDisplayDate } from './leave-calculator';

describe('leave-calculator', () => {
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

  it('should format display dates correctly', () => {
    expect(formatDisplayDate('2026-09-14')).toContain('Sep 14, 2026');
    expect(formatDisplayDate('')).toBe('—');
  });
});
