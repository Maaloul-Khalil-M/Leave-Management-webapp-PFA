import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface EmployeeProfileResponse {
  id: string;
  employeeNumber?: string;
  employmentStatus?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    hireDate?: string;
  };
  currentAssignment?: {
    departmentLabel?: string;
    positionLabel?: string;
    countryCode?: string;
  };
  currentManager?: {
    employeeId?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export interface EmployeeProfileData {
  id?: string;
  employeeNumber?: string;
  employmentStatus?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position: string;
  department?: string;
  manager?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080';

  readonly profile = signal<EmployeeProfileData | null>(null);
  readonly loading = signal(false);

  loadProfile(forceRefresh = false): Observable<EmployeeProfileData | null> {
    if (!forceRefresh && this.profile()) {
      return of(this.profile());
    }

    this.loading.set(true);
    return this.http
      .get<EmployeeProfileResponse>(`${this.apiUrl}/api/employee/profile`)
      .pipe(
        map((res) => {
          if (!res) return null;
          const p = res.profile;
          const fullName =
            [p?.firstName, p?.lastName].filter(Boolean).join(' ') ||
            p?.email?.split('@')[0] ||
            'Employee';

          const mgr =
            res.currentManager?.name ||
            [res.currentManager?.firstName, res.currentManager?.lastName]
              .filter(Boolean)
              .join(' ') ||
            undefined;

          const data: EmployeeProfileData = {
            id: res.id,
            employeeNumber: res.employeeNumber,
            employmentStatus: res.employmentStatus,
            name: fullName,
            firstName: p?.firstName,
            lastName: p?.lastName,
            email: p?.email || '',
            phone: p?.phone,
            position:
              res.currentAssignment?.positionLabel || 'Employee',
            department: res.currentAssignment?.departmentLabel || '',
            manager: mgr,
          };
          this.profile.set(data);
          this.loading.set(false);
          return data;
        }),
        catchError((err) => {
          console.warn('Could not load user profile', err);
          this.loading.set(false);
          return of(null);
        })
      );
  }

  setProfile(data: EmployeeProfileData): void {
    this.profile.set(data);
  }

  clear(): void {
    this.profile.set(null);
  }
}
