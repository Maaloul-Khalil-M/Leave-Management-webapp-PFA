export interface Profile {
  id: string;
  name: string;
  position: string;
  department: string;
  manager: string;
  avatarUrl: string | null;
  accrualRate: string;
  fiscalPeriod: string;
  email: string;
}

export interface LeaveBalance {
  type: string;
  code: string;
  total: number;
  used: number;
  remaining: number;
  color: string;
  icon?: string;
  category?: 'accruing' | 'non-accruing';
}

export interface BalanceCalculation {
  baseAccrual: number;
  carriedOver: number;
  deductions: number;
}

export interface LeaveBalancesResponse {
  balances: LeaveBalance[];
  calculation: BalanceCalculation;
}

export interface UpcomingLeave {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
}

export interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  submittedAt: string;
}

export interface LeaveLedgerEntry {
  id: string;
  date: string;
  leaveType: string;
  days: number;
  reason: string;
  status: string;
  balance: number;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  color: string;
  status?: string;
  days?: number;
}

export interface CalendarData {
  events: CalendarEvent[];
  highlightDate: string;
}
