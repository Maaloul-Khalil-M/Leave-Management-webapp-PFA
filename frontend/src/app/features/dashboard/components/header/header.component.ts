import { Component, OnInit, inject, input, output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { ThemeSwitcher } from '../../../../core/layout/theme-switcher/theme-switcher';
import { NotificationBellComponent } from '../../../../core/layout/notification-bell/notification-bell.component';
import { NotificationItem } from '../../../../core/layout/notification-bell/notification.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Profile } from '../../models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    ThemeSwitcher,
    NotificationBellComponent
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly profile = input<Profile | null>(null);

  readonly requestLeave = output<void>();
  readonly signOut = output<void>();

  notifications: NotificationItem[] = [];

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.listMine().subscribe({
      next: (res) => {
        this.notifications = (res.data || []).map((n) => this.notificationService.mapToItem(n));
      },
      error: () => {}
    });
  }

  onNotificationClick(item: NotificationItem): void {
    this.notificationService.markAsRead(item.id).subscribe({
      next: () => {
        item.read = true;
      }
    });
  }

  onSeeAll(): void {
    this.router.navigate(['/leave-requests']);
  }
}
