import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type LeaveTypeCode = 'PAID_ANNUAL' | 'SICK' | 'UNPAID' | 'MATERNITY';

export interface CreateLeaveRequest {
  leaveTypeCode: LeaveTypeCode;
  startDate: string;
  endDate: string;
  halfDayStart: boolean;
  halfDayEnd: boolean;
  reason?: string;
}

export interface LeaveRequestResponse {
  id: string;
  employeeId: string;
  leaveTypeCode: LeaveTypeCode;
  startDate: string;
  endDate: string;
  halfDayStart: boolean;
  halfDayEnd: boolean;
  durationDays: number;
  status: string;
  reason?: string;
  submittedAt?: string;
}

export interface PageResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

@Injectable({ providedIn: 'root' })
export class LeaveRequestService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080';

  createDraft(dto: CreateLeaveRequest): Observable<LeaveRequestResponse> {
    return this.http.post<LeaveRequestResponse>(
      `${this.apiUrl}/api/employee/leave-requests`,
      dto
    );
  }

  listMine(): Observable<PageResponse<LeaveRequestResponse>> {
    return this.http.get<PageResponse<LeaveRequestResponse>>(
      `${this.apiUrl}/api/employee/leave-requests`
    );
  }
}
