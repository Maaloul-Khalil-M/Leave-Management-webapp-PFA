import {Injectable, inject, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, tap} from 'rxjs';

export interface UserResponse {
  id: string;
  email: string;
  employeeId: string | null;
  accountStatus: AccountStatus;
  identity: Identity;
  createdAt: string;
  updatedAt: string;
}

export interface Identity {
  provider: string;
  subject: string;
}

export type AccountStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';

@Injectable({providedIn: 'root'})
export class MeService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:8080'; // Replace with your actual API URL

  readonly me = signal<UserResponse | null>(null);

  loadMe(): Observable<UserResponse> {
    return this.http
               .get<UserResponse>(`${(this.apiUrl)}/api/employee`)
               .pipe(
                 tap((user) => this.me.set(user))
               );
  }

  callWork(): Observable<unknown> {
    return this.http.get(
      `${this.apiUrl}/api/test`
    );
  }
}
