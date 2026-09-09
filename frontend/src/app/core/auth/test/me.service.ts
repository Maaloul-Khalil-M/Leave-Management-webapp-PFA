import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface MeResponse {
  keycloakSubject: string;
  email: string;
  preferredUsername: string | null;
  linked: boolean;
  appUserId: string;
  employeeId: string | null;
  employeeFullName: string | null;
  department: string | null;
  /** PENDING | ACTIVE | null */
  employeeStatus: string | null;
  /** From Keycloak JWT (realm + client roles) */
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class MeService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:8081';

  readonly me = signal<MeResponse | null>(null);

  loadMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.base}/api/v1/me`).pipe(tap((r) => this.me.set(r)));
  }

  callWork(): Observable<unknown> {
    return this.http.get(`${this.base}/api/v1/work`);
  }
}
