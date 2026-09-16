import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Attendance } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AttendanceApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/assets/mock-api';

  getAttendance(): Observable<Attendance> {
    return this.http.get<Attendance>(`${this.baseUrl}/attendance.json`);
  }
}
