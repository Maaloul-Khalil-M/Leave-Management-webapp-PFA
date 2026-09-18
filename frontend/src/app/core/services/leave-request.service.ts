import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type LeaveTypeCode = 'PAID_ANNUAL' | 'SICK' | 'UNPAID' | 'MATERNITY';

export type ExplanationSeverity = 'INFO' | 'WARNING' | 'BLOCKING';

export interface Explanation {
  code: string;
  severity: ExplanationSeverity;
  title: string;
  body: string;
  params?: Record<string, any>;
}

export interface EligibilityCheckRequest {
  leaveTypeCode: LeaveTypeCode;
  startDate: string;
  endDate: string;
  halfDayStart?: boolean;
  halfDayEnd?: boolean;
  excludeRequestId?: string;
}

export interface EligibilityResponse {
  eligible: boolean;
  durationDays: number;
  availableBalance: number | null;
  blockingCode: string | null;
  reasons: string[];
  explanations: Explanation[];
}

export interface SupportingDocumentResponse {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface CreateLeaveRequest {
  leaveTypeCode: LeaveTypeCode;
  startDate: string;
  endDate: string;
  halfDayStart: boolean;
  halfDayEnd: boolean;
  reason?: string;
  supportingDocuments?: string[];
}

export interface EmployeeSnapshot {
  employeeId?: string;
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  departmentLabel?: string;
  positionLabel?: string;
}

export interface LeaveRequestResponse {
  id: string;
  employeeId: string;
  employeeSnapshot?: EmployeeSnapshot;
  leaveTypeCode: LeaveTypeCode;
  startDate: string;
  endDate: string;
  halfDayStart: boolean;
  halfDayEnd: boolean;
  durationDays: number;
  status: string;
  reason?: string;
  supportingDocuments?: string[];
  submittedAt?: string;
  validatedAt?: string;
  validatedBy?: string;
  validationComment?: string;
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

  checkEligibility(dto: EligibilityCheckRequest): Observable<EligibilityResponse> {
    return this.http.post<EligibilityResponse>(
      `${this.apiUrl}/api/employee/leave-requests/eligibility`,
      dto
    );
  }

  createDraft(dto: CreateLeaveRequest): Observable<LeaveRequestResponse> {
    return this.http.post<LeaveRequestResponse>(
      `${this.apiUrl}/api/employee/leave-requests`,
      dto
    );
  }

  submit(id: string): Observable<LeaveRequestResponse> {
    return this.http.post<LeaveRequestResponse>(
      `${this.apiUrl}/api/employee/leave-requests/${id}/submit`,
      {}
    );
  }

  cancel(id: string, reason?: string): Observable<LeaveRequestResponse> {
    return this.http.post<LeaveRequestResponse>(
      `${this.apiUrl}/api/employee/leave-requests/${id}/cancel`,
      { reason }
    );
  }

  listMine(): Observable<PageResponse<LeaveRequestResponse>> {
    return this.http.get<PageResponse<LeaveRequestResponse>>(
      `${this.apiUrl}/api/employee/leave-requests`
    );
  }

  listPendingTeamRequests(): Observable<PageResponse<LeaveRequestResponse>> {
    return this.http.get<PageResponse<LeaveRequestResponse>>(
      `${this.apiUrl}/api/manager/leave-requests/pending`
    );
  }

  approve(id: string, comment?: string): Observable<LeaveRequestResponse> {
    return this.http.post<LeaveRequestResponse>(
      `${this.apiUrl}/api/manager/leave-requests/${id}/approve`,
      { comment }
    );
  }

  reject(id: string, comment: string): Observable<LeaveRequestResponse> {
    return this.http.post<LeaveRequestResponse>(
      `${this.apiUrl}/api/manager/leave-requests/${id}/reject`,
      { comment }
    );
  }

  uploadDocument(file: File): Observable<SupportingDocumentResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<SupportingDocumentResponse>(
      `${this.apiUrl}/api/employee/leave-requests/documents`,
      formData
    );
  }

  downloadDocument(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/documents/${id}`, {
      responseType: 'blob',
    });
  }

  getDocumentMetadata(id: string): Observable<SupportingDocumentResponse> {
    return this.http.get<SupportingDocumentResponse>(
      `${this.apiUrl}/api/documents/${id}/metadata`
    );
  }
}
