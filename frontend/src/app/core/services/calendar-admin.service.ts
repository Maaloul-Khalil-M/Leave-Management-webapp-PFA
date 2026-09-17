import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from './leave-request.service';
import { CountryCode } from './organization.service';

export type DayType = 'PUBLIC_HOLIDAY' | 'SPECIAL_NON_WORKING_DAY' | 'SPECIAL_WORKING_DAY';

export interface CalendarDto {
  id?: string;
  code: string;
  name: string;
  country: CountryCode;
  year: number;
}

export interface CalendarDayDto {
  id?: string;
  calendarId?: string;
  date: string;
  dayType: DayType;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class CalendarAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080';

  // ==========================================
  // Calendars
  // ==========================================

  listCalendars(): Observable<PageResponse<CalendarDto>> {
    return this.http.get<PageResponse<CalendarDto>>(`${this.apiUrl}/api/calendars`);
  }

  getCalendar(id: string): Observable<CalendarDto> {
    return this.http.get<CalendarDto>(`${this.apiUrl}/api/calendars/${id}`);
  }

  createCalendar(dto: CalendarDto): Observable<CalendarDto> {
    return this.http.post<CalendarDto>(`${this.apiUrl}/api/calendars`, dto);
  }

  updateCalendar(id: string, dto: CalendarDto): Observable<CalendarDto> {
    return this.http.put<CalendarDto>(`${this.apiUrl}/api/calendars/${id}`, dto);
  }

  deleteCalendar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/calendars/${id}`);
  }

  // ==========================================
  // Calendar Days
  // ==========================================

  listCalendarDays(calendarId: string, dayType?: DayType): Observable<PageResponse<CalendarDayDto>> {
    const params = dayType ? `?dayType=${dayType}` : '';
    return this.http.get<PageResponse<CalendarDayDto>>(
      `${this.apiUrl}/api/calendars/${calendarId}/days${params}`
    );
  }

  getCalendarDay(calendarId: string, dayId: string): Observable<CalendarDayDto> {
    return this.http.get<CalendarDayDto>(`${this.apiUrl}/api/calendars/${calendarId}/days/${dayId}`);
  }

  createCalendarDay(calendarId: string, dto: CalendarDayDto): Observable<CalendarDayDto> {
    return this.http.post<CalendarDayDto>(`${this.apiUrl}/api/calendars/${calendarId}/days`, dto);
  }

  updateCalendarDay(calendarId: string, dayId: string, dto: CalendarDayDto): Observable<CalendarDayDto> {
    return this.http.put<CalendarDayDto>(
      `${this.apiUrl}/api/calendars/${calendarId}/days/${dayId}`,
      dto
    );
  }

  deleteCalendarDay(calendarId: string, dayId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/calendars/${calendarId}/days/${dayId}`);
  }
}
