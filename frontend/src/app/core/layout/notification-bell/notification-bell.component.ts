import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NotificationItem, NotificationStatus } from './notification.model';
import { RelativeTimePipe } from './relative-time.pipe';

const STATUS_ICON: Record<NotificationStatus, string> = {
  success: 'check_circle',
  error: 'cancel',
  warning: 'warning',
  info: 'info',
  pending: 'schedule',
};

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    MatBadgeModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    RelativeTimePipe,
  ],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent {
  /** Notifications to display, most recent first. */
  @Input() notifications: NotificationItem[] = [];

  /** Fired when the user clicks a single notification row. */
  @Output() notificationClick = new EventEmitter<NotificationItem>();

  /** Fired when the user clicks "See all activity". */
  @Output() seeAll = new EventEmitter<void>();

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  statusIcon(status: NotificationStatus): string {
    return STATUS_ICON[status];
  }

  onNotificationClick(item: NotificationItem): void {
    item.read = true;
    this.notificationClick.emit(item);
  }
}
