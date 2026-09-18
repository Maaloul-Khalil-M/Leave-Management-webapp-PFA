import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from './leave-request.service';
import { CountryCode } from './organization.service';
import { LeaveTypeCode } from './leave-request.service';

export type AccrualUnit = 'WORKING_DAY' | 'CALENDAR_DAY';
export type BonusApplication = 'RATE' | 'MAX_BALANCE';

export interface LeaveBonus {
  label: string;
  appliesTo: BonusApplication;
  isOverride: boolean;
  amount: number;
  minYearsOfService?: number | null;
  maxAge?: number | null;
  everyNYears?: number | null;
}

export interface LeavePolicyResponse {
  id: string;
  country: CountryCode;
  leaveTypeCode: LeaveTypeCode;
  accrualUnit: AccrualUnit;
  accrualRate: number;
  maxBalance?: number | null;
  minBlockDays?: number | null;
  noticeDays?: number | null;
  bonuses: LeaveBonus[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLeavePolicyRequest {
  country: CountryCode;
  leaveTypeCode: string;
  accrualUnit: AccrualUnit;
  accrualRate: number;
  maxBalance?: number | null;
  minBlockDays?: number | null;
  noticeDays?: number | null;
  bonuses: LeaveBonus[];
}

@Injectable({ providedIn: 'root' })
export class LeavePolicyAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080';

  listLeavePolicies(country?: CountryCode): Observable<PageResponse<LeavePolicyResponse>> {
    let params = new HttpParams();
    if (country) {
      params = params.set('country', country);
    }
    return this.http.get<PageResponse<LeavePolicyResponse>>(`${this.apiUrl}/api/hr/leave-policies`, {
      params,
    });
  }

  getLeavePolicyById(id: string): Observable<LeavePolicyResponse> {
    return this.http.get<LeavePolicyResponse>(`${this.apiUrl}/api/hr/leave-policies/${id}`);
  }

  createLeavePolicy(request: CreateLeavePolicyRequest): Observable<LeavePolicyResponse> {
    return this.http.post<LeavePolicyResponse>(`${this.apiUrl}/api/hr/leave-policies`, request);
  }
}
