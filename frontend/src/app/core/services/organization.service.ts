import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from './leave-request.service';

export interface DepartmentResponse {
  id: string;
  label: string;
}

export interface CreateDepartmentRequest {
  label: string;
}

export type CountryCode = 'TN' | 'FR';

export interface OrganizationSettingsResponse {
  id: string;
  companyName: string;
  country: CountryCode;
  weekendDays: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateOrganizationSettingsRequest {
  companyName: string;
  country: CountryCode;
  weekendDays: number[];
}

export interface PositionResponse {
  id: string;
  title: string;
  departmentId?: string;
}

export interface CreatePositionRequest {
  title: string;
  departmentId: string;
}

export interface UpdatePositionRequest {
  title?: string;
  departmentId?: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080';

  // Departments
  listDepartments(): Observable<PageResponse<DepartmentResponse>> {
    return this.http.get<PageResponse<DepartmentResponse>>(`${this.apiUrl}/api/departments`);
  }

  createDepartment(request: CreateDepartmentRequest): Observable<DepartmentResponse> {
    return this.http.post<DepartmentResponse>(`${this.apiUrl}/api/departments`, request);
  }

  // Positions
  listPositions(): Observable<PageResponse<PositionResponse>> {
    return this.http.get<PageResponse<PositionResponse>>(`${this.apiUrl}/api/positions`);
  }

  createPosition(request: CreatePositionRequest): Observable<PositionResponse> {
    return this.http.post<PositionResponse>(`${this.apiUrl}/api/positions`, request);
  }

  updatePosition(id: string, request: UpdatePositionRequest): Observable<PositionResponse> {
    return this.http.patch<PositionResponse>(`${this.apiUrl}/api/positions/${id}`, request);
  }

  // Organization Settings
  getSettings(): Observable<OrganizationSettingsResponse> {
    return this.http.get<OrganizationSettingsResponse>(`${this.apiUrl}/api/organization-settings`);
  }

  updateSettings(request: UpdateOrganizationSettingsRequest): Observable<OrganizationSettingsResponse> {
    return this.http.put<OrganizationSettingsResponse>(`${this.apiUrl}/api/organization-settings`, request);
  }
}
