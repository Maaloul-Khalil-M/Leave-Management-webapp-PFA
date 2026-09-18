import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LeaveTypeCode } from './leave-request.service';

export type LeaveRateStatus = 'ALL_PRESENT' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type PresenceStatus = 'PRESENT' | 'ON_LEAVE';

export interface TeamSummary {
  managerEmployeeId: string;
  managerName: string;
  departmentId?: string;
  departmentLabel?: string;
  totalMembers: number;
  activeScope: 'team' | 'department';
}

export interface PresenceKpi {
  totalMembers: number;
  presentTodayCount: number;
  onLeaveTodayCount: number;
  leaveRatePercentage: number;
  leaveRateStatus: LeaveRateStatus;
}

export interface ApprovalKpi {
  totalRequests: number;
  approvedCount: number;
  rejectedCount: number;
  approvalRatePercentage: number;
  pendingCount: number;
  stalePendingCount: number;
}

export interface TeamMemberRoster {
  employeeId: string;
  employeeNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  departmentLabel?: string;
  positionLabel?: string;
  employmentStatus?: string;
  presenceStatus: PresenceStatus;
  activeLeaveTypeCode?: LeaveTypeCode;
  activeLeaveStartDate?: string;
  activeLeaveEndDate?: string;
  activeLeaveDurationDays?: number;
}

export interface LeaveTypeStat {
  leaveTypeCode: LeaveTypeCode;
  label: string;
  requestCount: number;
  totalDays: number;
}

export interface TypeStatusBreakdown {
  leaveTypeCode: LeaveTypeCode;
  label: string;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  stalePendingCount: number;
}

export interface HeatmapDay {
  date: string; // 'yyyy-MM-dd'
  absentCount: number;
  absentEmployeeNames: string[];
}

export interface ManagerAnalyticsResponse {
  teamSummary: TeamSummary;
  presenceKpi: PresenceKpi;
  approvalKpi: ApprovalKpi;
  teamRoster: TeamMemberRoster[];
  leaveTypeStats: LeaveTypeStat[];
  typeStatusBreakdowns: TypeStatusBreakdown[];
  heatmapData: HeatmapDay[];
}

@Injectable({ providedIn: 'root' })
export class ManagerAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080';

  getAnalytics(scope: 'team' | 'department' = 'team'): Observable<ManagerAnalyticsResponse> {
    return this.http.get<ManagerAnalyticsResponse>(
      `${this.apiUrl}/api/manager/analytics?scope=${scope}`
    );
  }
}
