import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from './leave-request.service';

export type AccountStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface UserIdentity {
  provider?: string;
  subject?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  employeeId?: string;
  accountStatus: AccountStatus;
  identity?: UserIdentity;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserRequest {
  email: string;
  employeeId?: string;
}

export interface UpdateUserRequest {
  accountStatus?: AccountStatus;
  employeeId?: string;
}

@Injectable({ providedIn: 'root' })
export class UserAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080';

  listUsers(): Observable<PageResponse<UserResponse>> {
    return this.http.get<PageResponse<UserResponse>>(`${this.apiUrl}/api/admin/users`);
  }

  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/api/admin/users/${id}`);
  }

  createUser(request: CreateUserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/api/admin/users`, request);
  }

  updateUser(id: string, request: UpdateUserRequest): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.apiUrl}/api/admin/users/${id}`, request);
  }
}
