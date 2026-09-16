import { Injectable, inject, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ProfileApiService } from './profile-api.service';
import { AttendanceApiService } from './attendance-api.service';
import { LeaveApiService } from './leave-api.service';
import { TeamApiService } from './team-api.service';
import { HolidayApiService } from './holiday-api.service';
import {
  Profile,
  Attendance,
  LeaveBalance,
  BalanceCalculation,
  UpcomingLeave,
  TeamMemberOnLeave,
  LeaveRequest,
  LeaveLedgerEntry,
  Holiday,
  LeaveUtilization,
  CalendarData
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class DashboardStateService {
  private readonly profileApi = inject(ProfileApiService);
  private readonly attendanceApi = inject(AttendanceApiService);
  private readonly leaveApi = inject(LeaveApiService);
  private readonly teamApi = inject(TeamApiService);
  private readonly holidayApi = inject(HolidayApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly profile = signal<Profile | null>(null);
  readonly attendance = signal<Attendance | null>(null);
  readonly leaveBalances = signal<LeaveBalance[]>([]);
  readonly balanceCalculation = signal<BalanceCalculation | null>(null);
  readonly upcomingLeaves = signal<UpcomingLeave[]>([]);
  readonly teamOnLeave = signal<TeamMemberOnLeave[]>([]);
  readonly leaveRequests = signal<LeaveRequest[]>([]);
  readonly leaveLedger = signal<LeaveLedgerEntry[]>([]);
  readonly holidays = signal<Holiday[]>([]);
  readonly leaveUtilization = signal<LeaveUtilization | null>(null);
  readonly calendarData = signal<CalendarData | null>(null);

  readonly hasUpcomingLeaves = computed(() => this.upcomingLeaves().length > 0);

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      profile: this.profileApi.getProfile(),
      attendance: this.attendanceApi.getAttendance(),
      balances: this.leaveApi.getLeaveBalances(),
      upcoming: this.leaveApi.getUpcomingLeaves(),
      team: this.teamApi.getTeamOnLeave(),
      requests: this.leaveApi.getLeaveRequests(),
      ledger: this.leaveApi.getLeaveLedger(),
      holidays: this.holidayApi.getHolidays(),
      utilization: this.leaveApi.getLeaveUtilization(),
      calendar: this.leaveApi.getCalendarData()
    }).subscribe({
      next: (data) => {
        this.profile.set(data.profile);
        this.attendance.set(data.attendance);
        this.leaveBalances.set(data.balances.balances);
        this.balanceCalculation.set(data.balances.calculation);
        this.upcomingLeaves.set(data.upcoming.items);
        this.teamOnLeave.set(data.team.items);
        this.leaveRequests.set(data.requests.items);
        this.leaveLedger.set(data.ledger.items);
        this.holidays.set(data.holidays.items);
        this.leaveUtilization.set(data.utilization);
        this.calendarData.set(data.calendar);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
        this.error.set('Failed to load dashboard data. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
