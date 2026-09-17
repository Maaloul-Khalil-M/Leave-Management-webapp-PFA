/**
 * Utility functions for leave calculations and date formatting.
 */

export function calculateWorkingDays(
  startDateStr: string,
  endDateStr: string,
  halfDayStart = false,
  halfDayEnd = false
): number {
  if (!startDateStr || !endDateStr) return 0;
  if (endDateStr < startDateStr) return 0;

  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);

  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  let workingDays = 0;
  const current = new Date(start);

  let isStartWorking = false;
  let isEndWorking = false;

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const isWorking = dayOfWeek !== 0 && dayOfWeek !== 6;

    if (isWorking) {
      workingDays += 1;
    }

    if (current.toDateString() === start.toDateString()) {
      isStartWorking = isWorking;
    }
    if (current.toDateString() === end.toDateString()) {
      isEndWorking = isWorking;
    }

    current.setDate(current.getDate() + 1);
  }

  if (workingDays === 0) return 0;

  // Single day selection
  if (startDateStr === endDateStr) {
    if (isStartWorking && (halfDayStart || halfDayEnd)) {
      return 0.5;
    }
    return workingDays;
  }

  // Multi-day selection
  if (halfDayStart && isStartWorking) {
    workingDays -= 0.5;
  }
  if (halfDayEnd && isEndWorking) {
    workingDays -= 0.5;
  }

  return Math.max(0, workingDays);
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
