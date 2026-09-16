import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  LeaveBalancesResponse,
  UpcomingLeave,
  LeaveRequest,
  LeaveLedgerEntry,
  LeaveUtilization,
  CalendarData
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class LeaveApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/assets/mock-api';

  getLeaveBalances(): Observable<LeaveBalancesResponse> {
    return this.http.get<LeaveBalancesResponse>(`${this.baseUrl}/leave-balances.json`);
  }

  getUpcomingLeaves(): Observable<{ items: UpcomingLeave[] }> {
    return this.http.get<{ items: UpcomingLeave[] }>(`${this.baseUrl}/upcoming-leaves.json`);
  }

  getLeaveRequests(): Observable<{ items: LeaveRequest[] }> {
    return this.http.get<{ items: LeaveRequest[] }>(`${this.baseUrl}/leave-requests.json`);
  }

  getLeaveLedger(): Observable<{ items: LeaveLedgerEntry[] }> {
    return this.http.get<{ items: LeaveLedgerEntry[] }>(`${this.baseUrl}/leave-ledger.json`);
  }

  getLeaveUtilization(): Observable<LeaveUtilization> {
    return this.http.get<LeaveUtilization>(`${this.baseUrl}/leave-utilization.json`);
  }

  getCalendarData(): Observable<CalendarData> {
    return this.http.get<CalendarData>(`${this.baseUrl}/calendar-events.json`);
  }
}
