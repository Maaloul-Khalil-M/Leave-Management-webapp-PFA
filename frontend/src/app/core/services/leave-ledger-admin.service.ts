import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from './leave-request.service';

export type LedgerMovementType =
  | 'HR_ADJUSTMENT_CREDIT'
  | 'HR_ADJUSTMENT_DEBIT'
  | 'CORRECTION_CREDIT'
  | 'CORRECTION_DEBIT'
  | 'MONTHLY_ACCRUAL'
  | 'CARRY_OVER'
  | 'APPROVED_LEAVE_DEBIT'
  | 'CANCELLED_LEAVE_CREDIT';

export interface LedgerMovement {
  date: string;
  type: LedgerMovementType;
  amount: number;
  note?: string;
  leaveRequestId?: string;
  actorUserId?: string;
}

export interface LeaveLedgerResponse {
  id: string;
  employeeId: string;
  leaveTypeCode: string;
  year: number;
  policyId?: string;
  accruedToDate: number;
  consumedBalance: number;
  carriedOverFromPreviousYear: number;
  availableBalance: number;
  movements: LedgerMovement[];
  accrualRate?: number;
  accrualUnit?: string;
  leaveTypeLabel?: string;
}

export interface LeaveAdjustmentRequest {
  employeeId: string;
  leaveTypeCode: string;
  year: number;
  amount: number;
  type: LedgerMovementType;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class LeaveLedgerAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080';

  /**
   * List leave ledgers for an employee, optionally filtered by year.
   */
  getEmployeeLedgers(employeeId: string, year?: number): Observable<PageResponse<LeaveLedgerResponse>> {
    let params = new HttpParams().set('employeeId', employeeId);
    if (year !== undefined && year !== null) {
      params = params.set('year', year.toString());
    }
    return this.http.get<PageResponse<LeaveLedgerResponse>>(`${this.apiUrl}/api/hr/leave-ledgers`, {
      params,
    });
  }

  /**
   * Get a specific leave ledger by its ID.
   */
  getLedgerById(id: string): Observable<LeaveLedgerResponse> {
    return this.http.get<LeaveLedgerResponse>(`${this.apiUrl}/api/hr/leave-ledgers/${id}`);
  }

  /**
   * Record a manual HR adjustment or correction.
   */
  adjustLedger(request: LeaveAdjustmentRequest): Observable<LeaveLedgerResponse> {
    return this.http.post<LeaveLedgerResponse>(`${this.apiUrl}/api/hr/leave-adjustments`, request);
  }
}
