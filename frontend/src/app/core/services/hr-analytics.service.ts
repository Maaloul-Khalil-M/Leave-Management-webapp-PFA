import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LeaveTypeCode } from './leave-request.service';
import { LeaveRateStatus, PresenceStatus } from './manager-analytics.service';

export interface OrganizationSummary {
  activeScope: string;
  departmentLabel: string;
  totalWorkforce: number;
  totalDepartments: number;
}

export interface DepartmentOption {
  departmentId: string;
  departmentLabel: string;
}

export interface DepartmentStat {
  departmentId: string;
  departmentLabel: string;
  headcount: number;
  presentCount: number;
  onLeaveCount: number;
  leaveRatePercentage: number;
  pendingCount: number;
  stalePendingCount: number;
}

export interface HrPresenceKpi {
  totalMembers: number;
  presentTodayCount: number;
  onLeaveTodayCount: number;
  leaveRatePercentage: number;
  leaveRateStatus: LeaveRateStatus;
}

export interface HrApprovalKpi {
  totalRequests: number;
  approvedCount: number;
  rejectedCount: number;
  approvalRatePercentage: number;
  pendingCount: number;
  stalePendingCount: number;
}

export interface WorkforceMemberRoster {
  employeeId: string;
  employeeNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  departmentId?: string;
  departmentLabel?: string;
  positionLabel?: string;
  employmentStatus?: string;
  presenceStatus: PresenceStatus;
  activeLeaveTypeCode?: LeaveTypeCode;
  activeLeaveStartDate?: string;
  activeLeaveEndDate?: string;
  activeLeaveDurationDays?: number;
}

export interface HrLeaveTypeStat {
  leaveTypeCode: LeaveTypeCode;
  label: string;
  requestCount: number;
  totalDays: number;
}

export interface HrTypeStatusBreakdown {
  leaveTypeCode: LeaveTypeCode;
  label: string;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  stalePendingCount: number;
}

export interface HrHeatmapDay {
  date: string;
  absentCount: number;
  absentEmployeeNames: string[];
}

export interface HrAnalyticsResponse {
  organizationSummary: OrganizationSummary;
  presenceKpi: HrPresenceKpi;
  approvalKpi: HrApprovalKpi;
  availableDepartments: DepartmentOption[];
  departmentStats: DepartmentStat[];
  workforceRoster: WorkforceMemberRoster[];
  leaveTypeStats: HrLeaveTypeStat[];
  typeStatusBreakdowns: HrTypeStatusBreakdown[];
  heatmapData: HrHeatmapDay[];
}

@Injectable({ providedIn: 'root' })
export class HrAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080';

  getAnalytics(departmentId?: string): Observable<HrAnalyticsResponse> {
    const query = departmentId && departmentId !== 'ALL' ? `?departmentId=${departmentId}` : '';
    return this.http.get<HrAnalyticsResponse>(`${this.apiUrl}/api/hr/analytics${query}`);
  }
}
