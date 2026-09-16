import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TeamMemberOnLeave } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TeamApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/assets/mock-api';

  getTeamOnLeave(): Observable<{ items: TeamMemberOnLeave[] }> {
    return this.http.get<{ items: TeamMemberOnLeave[] }>(`${this.baseUrl}/team-on-leave.json`);
  }
}
