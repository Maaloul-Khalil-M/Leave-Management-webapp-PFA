import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Profile } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/assets/mock-api';

  getProfile(): Observable<Profile> {
    return this.http.get<Profile>(`${this.baseUrl}/profile.json`);
  }
}
