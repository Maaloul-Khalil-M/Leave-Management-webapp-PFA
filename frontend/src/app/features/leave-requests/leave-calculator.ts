export type AccrualUnit = 'WORKING_DAY' | 'CALENDAR_DAY';

export function calculateCalendarDays(
  startDateStr: string,
  endDateStr: string,
  halfDayStart = false,
  halfDayEnd = false
): number {
  if (!startDateStr || !endDateStr) return 0;
  if (endDateStr < startDateStr) return 0;

  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);

  const start = new Date(sy, sm - 1, sd, 12, 0, 0);
  const end = new Date(ey, em - 1, ed, 12, 0, 0);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const diffTime = end.getTime() - start.getTime();
  const totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (totalDays <= 0) return 0;

  if (startDateStr === endDateStr) {
    if (halfDayStart || halfDayEnd) {
      return 0.5;
    }
    return totalDays;
  }

  let days: number = totalDays;
  if (halfDayStart) {
    days -= 0.5;
  }
  if (halfDayEnd) {
    days -= 0.5;
  }

  return Math.max(0, days);
}

export function calculateLeaveDuration(
  startDateStr: string,
  endDateStr: string,
  accrualUnit: AccrualUnit = 'WORKING_DAY',
  halfDayStart = false,
  halfDayEnd = false
): number {
  if (accrualUnit === 'CALENDAR_DAY') {
    return calculateCalendarDays(startDateStr, endDateStr, halfDayStart, halfDayEnd);
  }
  return calculateWorkingDays(startDateStr, endDateStr, halfDayStart, halfDayEnd);
}

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

  // Use noon (12:00:00) to avoid any DST or timezone midnight shifts
  const start = new Date(sy, sm - 1, sd, 12, 0, 0);
  const end = new Date(ey, em - 1, ed, 12, 0, 0);

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
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d, 12, 0, 0);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isBeforeStartDate(startDateStr: string, asOfDate: Date = new Date()): boolean {
  if (!startDateStr) return false;
  const year = asOfDate.getFullYear();
  const month = String(asOfDate.getMonth() + 1).padStart(2, '0');
  const day = String(asOfDate.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  return startDateStr > todayStr;
}

