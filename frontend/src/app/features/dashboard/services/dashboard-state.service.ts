import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  Profile,
  LeaveBalance,
  BalanceCalculation,
  UpcomingLeave,
  LeaveRequest,
  LeaveLedgerEntry,
  Holiday,
  CalendarData,
  CalendarEvent
} from '../models';
import { UserProfileService } from '../../../core/services/user-profile.service';

interface EmployeeProfileResponse {
  id: string;
  employeeNumber?: string;
  employmentStatus?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    hireDate?: string;
  };
  currentAssignment?: {
    departmentLabel?: string;
    positionLabel?: string;
    countryCode?: string;
  };
  currentManager?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

interface LeaveLedgerResponse {
  id: string;
  employeeId: string;
  leaveTypeCode: string;
  year: number;
  accruedToDate: number;
  consumedBalance: number;
  carriedOverFromPreviousYear: number;
  availableBalance: number;
  movements?: Array<{
    date: string;
    type: string;
    amount: number;
    note?: string;
    leaveRequestId?: string;
  }>;
}

interface LeaveRequestItem {
  id: string;
  employeeId: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  halfDayStart: boolean;
  halfDayEnd: boolean;
  durationDays: number;
  status: string;
  reason?: string;
  createdAt?: string;
}

interface CalendarDayItem {
  id: string;
  date: string;
  dayType: string;
  label: string;
}

interface PageResponse<T> {
  data: T[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardStateService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080';
  private readonly userProfileService = inject(UserProfileService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly profile = signal<Profile | null>(null);
  readonly leaveBalances = signal<LeaveBalance[]>([]);
  readonly balanceCalculation = signal<BalanceCalculation | null>(null);
  readonly upcomingApprovedLeaves = signal<UpcomingLeave[]>([]);
  readonly leaveRequests = signal<LeaveRequest[]>([]);
  readonly leaveLedger = signal<LeaveLedgerEntry[]>([]);
  readonly holidays = signal<Holiday[]>([]);
  readonly calendarData = signal<CalendarData | null>(null);

  // Utilization metrics derived from real ledger and requests
  readonly totalTaken = computed(() =>
    this.leaveBalances().reduce((acc, b) => acc + (b.used || 0), 0)
  );
  readonly totalAvailable = computed(() => {
    const annual = this.leaveBalances().find((b) => b.code === 'PAID_ANNUAL');
    return annual ? annual.remaining : 0;
  });

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    const currentYear = new Date().getFullYear();
    const todayStr = new Date().toISOString().split('T')[0];

    const profile$ = this.http.get<EmployeeProfileResponse>(`${this.apiUrl}/api/employee/profile`).pipe(
      catchError((err) => {
        console.warn('Could not load employee profile, falling back to minimal state', err);
        return of(null);
      })
    );

    const ledgers$ = this.http.get<PageResponse<LeaveLedgerResponse>>(`${this.apiUrl}/api/employee/leave-ledgers`).pipe(
      map((res) => res?.data || []),
      catchError((err) => {
        console.warn('Could not load leave ledgers', err);
        return of([] as LeaveLedgerResponse[]);
      })
    );

    const requests$ = this.http.get<PageResponse<LeaveRequestItem>>(`${this.apiUrl}/api/employee/leave-requests`).pipe(
      map((res) => res?.data || []),
      catchError((err) => {
        console.warn('Could not load leave requests', err);
        return of([] as LeaveRequestItem[]);
      })
    );

    const holidays$ = this.http.get<PageResponse<CalendarDayItem>>(`${this.apiUrl}/api/calendars/days?country=TN&year=${currentYear}`).pipe(
      map((res) => res?.data || []),
      catchError((err) => {
        console.warn('Could not load holidays calendar', err);
        return of([] as CalendarDayItem[]);
      })
    );

    forkJoin({
      profileData: profile$,
      ledgers: ledgers$,
      requests: requests$,
      holidayDays: holidays$
    }).subscribe({
      next: ({ profileData, ledgers, requests, holidayDays }) => {
        // 1. Profile
        if (profileData) {
          const p = profileData.profile;
          const fullName = [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Employee';
          const mgr = profileData.currentManager
            ? [profileData.currentManager.firstName, profileData.currentManager.lastName].filter(Boolean).join(' ')
            : 'N/A';

          this.profile.set({
            id: profileData.employeeNumber || profileData.id || 'EMP-001',
            name: fullName,
            position: profileData.currentAssignment?.positionLabel || 'Software Engineer',
            department: profileData.currentAssignment?.departmentLabel || 'Engineering',
            manager: mgr,
            avatarUrl: null,
            accrualRate: '2.08 days/mo',
            fiscalPeriod: `Jan ${currentYear} – Dec ${currentYear}`,
            email: p?.email || ''
          });

          this.userProfileService.setProfile({
            id: profileData.id,
            employeeNumber: profileData.employeeNumber,
            employmentStatus: profileData.employmentStatus,
            name: fullName,
            firstName: p?.firstName,
            lastName: p?.lastName,
            email: p?.email || '',
            phone: p?.phone,
            position: profileData.currentAssignment?.positionLabel || 'Software Engineer',
            department: profileData.currentAssignment?.departmentLabel || '',
            manager: mgr
          });
        }

        // 2. Leave Balances for all types (accruing vs non-accruing)
        const balancesList: LeaveBalance[] = [];
        let annualBase = 0;
        let annualCarried = 0;
        let annualDeductions = 0;

        if (ledgers && ledgers.length > 0) {
          ledgers.forEach((l) => {
            const label = this.formatTypeCode(l.leaveTypeCode);
            const total = (l.accruedToDate || 0) + (l.carriedOverFromPreviousYear || 0);
            const used = l.consumedBalance || 0;
            const remaining = l.availableBalance || 0;
            const color = this.getColorForType(l.leaveTypeCode);

            balancesList.push({
              type: label,
              code: l.leaveTypeCode,
              total,
              used,
              remaining,
              color,
              category: l.leaveTypeCode === 'PAID_ANNUAL' ? 'accruing' : 'non-accruing'
            });

            if (l.leaveTypeCode === 'PAID_ANNUAL') {
              annualBase = l.accruedToDate || 0;
              annualCarried = l.carriedOverFromPreviousYear || 0;
              annualDeductions = l.consumedBalance || 0;
            }
          });
        }

        // Ensure all 4 catalog types exist in list if not in ledgers yet
        const requiredCodes = ['PAID_ANNUAL', 'SICK', 'UNPAID', 'MATERNITY'];
        requiredCodes.forEach((code) => {
          if (!balancesList.some((b) => b.code === code)) {
            balancesList.push({
              type: this.formatTypeCode(code),
              code,
              total: code === 'PAID_ANNUAL' ? 25 : 0,
              used: 0,
              remaining: code === 'PAID_ANNUAL' ? 25 : 0,
              color: this.getColorForType(code),
              category: code === 'PAID_ANNUAL' ? 'accruing' : 'non-accruing'
            });
            if (code === 'PAID_ANNUAL' && annualBase === 0) {
              annualBase = 25;
            }
          }
        });

        this.leaveBalances.set(balancesList);
        this.balanceCalculation.set({
          baseAccrual: annualBase,
          carriedOver: annualCarried,
          deductions: annualDeductions
        });

        // 3. Recent Requests
        const mappedRequests: LeaveRequest[] = requests.map((r) => ({
          id: r.id,
          type: this.formatTypeCode(r.leaveTypeCode),
          startDate: r.startDate,
          endDate: r.endDate,
          days: r.durationDays,
          status: this.formatStatus(r.status),
          submittedAt: r.createdAt || r.startDate
        }));
        this.leaveRequests.set(mappedRequests);

        // 4. Upcoming APPROVED leaves only (strictly approved future leaves)
        const upcomingApproved = mappedRequests
          .filter((r) => r.endDate >= todayStr && r.status === 'Approved')
          .sort((a, b) => a.startDate.localeCompare(b.startDate));
        this.upcomingApprovedLeaves.set(upcomingApproved);

        // 5. Leave Ledger Movements
        const ledgerEntries: LeaveLedgerEntry[] = [];
        ledgers.forEach((l) => {
          if (l.movements && l.movements.length > 0) {
            l.movements.forEach((m, idx) => {
              ledgerEntries.push({
                id: `${l.id}-${idx}`,
                date: m.date,
                leaveType: this.formatTypeCode(l.leaveTypeCode),
                days: m.amount,
                reason: m.note || (m.type === 'ACCRUAL' ? 'Monthly Accrual' : 'Leave Adjustment'),
                status: 'Approved',
                balance: l.availableBalance
              });
            });
          }
        });
        ledgerEntries.sort((a, b) => b.date.localeCompare(a.date));
        this.leaveLedger.set(ledgerEntries);

        // 6. Company Holidays (scoped strictly to the active fiscal year)
        const mappedHolidays: Holiday[] = holidayDays
          .filter((d) => d.dayType === 'PUBLIC_HOLIDAY' && d.date.startsWith(String(currentYear)))
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((d) => ({
            id: d.id,
            name: d.label,
            date: d.date
          }));
        this.holidays.set(mappedHolidays);

        // 7. Calendar Data (Holidays + Approved and Pending Leaves)
        const calendarEvents: CalendarEvent[] = [];
        mappedHolidays.forEach((h) => {
          calendarEvents.push({
            id: `hol-${h.id}`,
            title: h.name,
            start: h.date,
            end: h.date,
            type: 'Holiday',
            color: '#f87171'
          });
        });

        mappedRequests.forEach((req) => {
          calendarEvents.push({
            id: `leave-${req.id}`,
            title: `${req.type} (${req.status})`,
            start: req.startDate,
            end: req.endDate,
            type: 'Leave',
            color: req.status === 'Approved' ? '#60a5fa' : '#fbbf24'
          });
        });

        this.calendarData.set({
          events: calendarEvents,
          highlightDate: todayStr
        });

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
        this.error.set('Failed to load dashboard data. Please check your backend connection.');
        this.loading.set(false);
      }
    });
  }

  private formatTypeCode(code: string): string {
    switch (code) {
      case 'PAID_ANNUAL':
        return 'Paid Annual';
      case 'SICK':
        return 'Sick Leave';
      case 'UNPAID':
        return 'Unpaid Leave';
      case 'MATERNITY':
        return 'Maternity Leave';
      default:
        return code ? code.replace(/_/g, ' ') : 'Leave';
    }
  }

  private formatStatus(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'Draft';
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Pending';
    }
  }

  private getColorForType(code: string): string {
    switch (code) {
      case 'PAID_ANNUAL':
        return '#3b82f6';
      case 'SICK':
        return '#10b981';
      case 'MATERNITY':
        return '#8b5cf6';
      case 'UNPAID':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  }
}
