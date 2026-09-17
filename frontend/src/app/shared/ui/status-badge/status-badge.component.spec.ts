import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { getStatusCategory, formatStatusLabel } from './status-badge.component';

describe('StatusBadge Utilities', () => {
  it('correctly maps APPROVED and ACTIVE status to approved/active category', () => {
    expect(getStatusCategory('APPROVED')).toBe('approved');
    expect(getStatusCategory('approved')).toBe('approved');
    expect(getStatusCategory('ACTIVE')).toBe('active');
    expect(getStatusCategory('active')).toBe('active');
  });

  it('correctly maps PENDING, SUBMITTED, SUSPENDED, and SPECIAL_WORKING_DAY', () => {
    expect(getStatusCategory('PENDING')).toBe('pending');
    expect(getStatusCategory('SUBMITTED')).toBe('pending');
    expect(getStatusCategory('SUSPENDED')).toBe('suspended');
    expect(getStatusCategory('SPECIAL_WORKING_DAY')).toBe('pending');
  });

  it('correctly maps REJECTED and TERMINATED', () => {
    expect(getStatusCategory('REJECTED')).toBe('rejected');
    expect(getStatusCategory('TERMINATED')).toBe('terminated');
  });

  it('correctly maps DRAFT and CANCELLED', () => {
    expect(getStatusCategory('DRAFT')).toBe('draft');
    expect(getStatusCategory('CANCELLED')).toBe('cancelled');
    expect(getStatusCategory('CANCELED')).toBe('cancelled');
  });

  it('correctly maps calendar special days to holiday', () => {
    expect(getStatusCategory('PUBLIC_HOLIDAY')).toBe('holiday');
    expect(getStatusCategory('SPECIAL_NON_WORKING_DAY')).toBe('holiday');
  });

  it('defaults to neutral for unknown statuses', () => {
    expect(getStatusCategory('UNKNOWN')).toBe('neutral');
    expect(getStatusCategory('')).toBe('neutral');
  });

  it('formats display labels to title case and formats special calendar types', () => {
    expect(formatStatusLabel('APPROVED')).toBe('Approved');
    expect(formatStatusLabel('PUBLIC_HOLIDAY')).toBe('Public Holiday');
    expect(formatStatusLabel('SPECIAL_NON_WORKING_DAY')).toBe('Special Day');
    expect(formatStatusLabel('SPECIAL_WORKING_DAY')).toBe('Working Day');
  });

  it('respects a custom label override', () => {
    expect(formatStatusLabel('PENDING', 'Waiting Manager Review')).toBe('Waiting Manager Review');
  });
});
