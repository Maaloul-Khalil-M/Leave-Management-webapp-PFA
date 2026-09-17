import { Component, OnInit, inject, input, output, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { ThemeSwitcher } from '../theme-switcher/theme-switcher';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { NotificationItem } from '../notification-bell/notification.model';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../auth/auth.service';

export interface UserHeaderProfile {
  name?: string;
  position?: string;
  department?: string;
  email?: string;
}

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
    NotificationBellComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly profile = input<UserHeaderProfile | null>(null);

  readonly requestLeave = output<void>();
  readonly signOut = output<void>();

  notifications: NotificationItem[] = [];

  readonly displayName = computed(() => {
    const prof = this.profile();
    if (prof?.name) return prof.name;
    const user = this.auth.username();
    if (user) return user;
    const email = this.auth.email();
    if (email) return email.split('@')[0];
    return 'User';
  });

  readonly displayTitle = computed(() => {
    const prof = this.profile();
    if (prof?.position) return prof.position;
    if (this.auth.hasRole('ADMIN')) return 'System Administrator';
    if (this.auth.hasRole('HR')) return 'HR Administrator';
    if (this.auth.hasRole('MANAGER')) return 'Department Manager';
    return 'Employee';
  });

  readonly avatarLetter = computed(() => {
    const name = this.displayName();
    return name.charAt(0).toUpperCase();
  });

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    this.notificationService.listMine().subscribe({
      next: (res) => {
        this.notifications = (res.data || []).map((n) => this.notificationService.mapToItem(n));
      },
      error: () => {},
    });
  }

  onNotificationClick(item: NotificationItem): void {
    this.notificationService.markAsRead(item.id).subscribe({
      next: () => {
        item.read = true;
      },
    });
  }

  onSeeAll(): void {
    this.router.navigate(['/leave-requests']);
  }

  onRequestLeave(): void {
    // If parent component subscribed to requestLeave, emit to parent; otherwise route to /leave-requests
    this.requestLeave.emit();
    this.router.navigate(['/leave-requests']);
  }

  onSignOut(): void {
    this.signOut.emit();
    this.auth.logout();
  }
}
