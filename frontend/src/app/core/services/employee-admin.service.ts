import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from './leave-request.service';

export type EmploymentStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

export interface EmployeeProfile {
  firstName: string;
  lastName: string;
  gender?: string;
  birthDate?: string;
  email: string;
  phone?: string;
  hireDate?: string;
  departureDate?: string;
}

export interface Assignment {
  departmentId: string;
  departmentLabel: string;
  positionId: string;
  positionLabel: string;
  startDate: string;
  endDate?: string;
  countryCode?: string;
}

export interface ManagerRef {
  employeeId: string;
  name: string;
}

export interface EmployeeResponse {
  id: string;
  employeeNumber: string;
  employmentStatus: EmploymentStatus;
  profile: EmployeeProfile;
  currentAssignment?: Assignment;
  assignmentHistory?: Assignment[];
  currentManager?: ManagerRef;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignmentRequest {
  departmentId: string;
  departmentLabel: string;
  positionId: string;
  positionLabel: string;
  startDate: string;
  endDate?: string;
}

export interface CreateEmployeeRequest {
  employeeNumber: string;
  employmentStatus?: EmploymentStatus;
  firstName: string;
  lastName: string;
  gender?: string;
  birthDate?: string;
  email: string;
  phone?: string;
  hireDate?: string;
  initialAssignment: AssignmentRequest;
  managerEmployeeId?: string;
}

export interface UpdateEmployeeRequest {
  employmentStatus?: EmploymentStatus;
  firstName?: string;
  lastName?: string;
  gender?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  hireDate?: string;
  departureDate?: string;
  newAssignment?: AssignmentRequest;
  managerEmployeeId?: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeeAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080';

  listEmployees(): Observable<PageResponse<EmployeeResponse>> {
    return this.http.get<PageResponse<EmployeeResponse>>(`${this.apiUrl}/api/hr/employees`);
  }

  getEmployeeById(id: string): Observable<EmployeeResponse> {
    return this.http.get<EmployeeResponse>(`${this.apiUrl}/api/hr/employees/${id}`);
  }

  createEmployee(request: CreateEmployeeRequest): Observable<EmployeeResponse> {
    return this.http.post<EmployeeResponse>(`${this.apiUrl}/api/hr/employees`, request);
  }

  updateEmployee(id: string, request: UpdateEmployeeRequest): Observable<EmployeeResponse> {
    return this.http.patch<EmployeeResponse>(`${this.apiUrl}/api/hr/employees/${id}`, request);
  }
}
