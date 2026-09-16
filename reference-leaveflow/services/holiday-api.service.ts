import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Holiday } from '../models';

@Injectable({
  providedIn: 'root'
})
export class HolidayApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/assets/mock-api';

  getHolidays(): Observable<{ items: Holiday[] }> {
    return this.http.get<{ items: Holiday[] }>(`${this.baseUrl}/holidays.json`);
  }
}
