import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PageResponse } from './leave-request.service';
import {
  NotificationItem,
  NotificationResponse,
  NotificationStatus,
} from '../layout/notification-bell/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080';

  listMine(): Observable<PageResponse<NotificationResponse>> {
    return this.http.get<PageResponse<NotificationResponse>>(`${this.apiUrl}/api/notifications`);
  }

  markAsRead(id: string): Observable<NotificationResponse> {
    return this.http.post<NotificationResponse>(`${this.apiUrl}/api/notifications/${id}/read`, {});
  }

  mapToItem(res: NotificationResponse): NotificationItem {
    let status: NotificationStatus = 'info';
    if (res.type === 'LEAVE_APPROVED') {
      status = 'success';
    } else if (res.type === 'LEAVE_REJECTED') {
      status = 'error';
    } else if (res.type === 'LEAVE_SUBMITTED') {
      status = 'info';
    }

    return {
      id: res.id,
      title: res.title,
      detail: res.message,
      timestamp: res.createdAt,
      read: res.read,
      status,
      leaveRequestId: res.leaveRequestId,
    };
  }
}
