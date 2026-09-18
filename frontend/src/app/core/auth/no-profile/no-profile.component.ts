import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-no-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
  ],
  template: `
    <div class="holding-page">
      <main class="holding-container">
        <div class="holding-card">
          <div class="holding-header">
            <div class="brand-mark">
              <img src="/LOGO.png" alt="Platana" class="brand-logo" />
            </div>

            <div class="status-badge" [class.suspended]="isSuspended()">
              <mat-icon class="status-icon">
                {{ isSuspended() ? 'block' : 'person_off' }}
              </mat-icon>
            </div>

            <h1 class="holding-title">{{ title() }}</h1>
            <p class="holding-subtitle">
              {{ description() }}
            </p>

            @if (userEmail()) {
              <div class="user-chip">
                <mat-icon class="chip-icon">account_circle</mat-icon>
                <span class="chip-text">{{ userEmail() }}</span>
              </div>
            }
          </div>

          <div class="holding-actions">
            <button
              type="button"
              class="logout-btn"
              (click)="onSignOut()"
            >
              <mat-icon>logout</mat-icon>
              <span>Log out</span>
            </button>
          </div>

          <div class="holding-footer">
            <span class="help-note">
              Please contact your system or HR administrator for access.
            </span>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      --page-bg: #f8fafc;
      --card-bg: #ffffff;
      --card-border: #e2e8f0;
      --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.08);
      --title-color: #0f172a;
      --subtitle-color: #64748b;
      --btn-bg: #ef4444;
      --btn-hover-bg: #dc2626;
      --btn-color: #ffffff;
      --footer-border: #f1f5f9;
      --note-color: #94a3b8;
      --focus-ring: #ef4444;
      --badge-bg: #fef2f2;
      --badge-color: #ef4444;
      --chip-bg: #f1f5f9;
      --chip-color: #475569;
    }

    :host-context(html.dark) {
      --page-bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
      --title-color: #f8fafc;
      --subtitle-color: #94a3b8;
      --btn-bg: #dc2626;
      --btn-hover-bg: #b91c1c;
      --btn-color: #ffffff;
      --footer-border: #334155;
      --note-color: #64748b;
      --focus-ring: #f87171;
      --badge-bg: #450a0a;
      --badge-color: #f87171;
      --chip-bg: #334155;
      --chip-color: #cbd5e1;
    }

    .holding-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--page-bg);
    }

    .holding-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }

    .holding-card {
      width: 100%;
      max-width: 440px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 2.5rem 2rem;
      box-shadow: var(--card-shadow);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .brand-mark {
      margin-bottom: 1.25rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .brand-logo {
      height: 48px;
      width: auto;
      object-fit: contain;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: var(--badge-bg);
      color: var(--badge-color);
      margin-bottom: 1.25rem;
    }

    .status-badge.suspended {
      background-color: #fff1f2;
      color: #e11d48;
    }

    :host-context(html.dark) .status-badge.suspended {
      background-color: #4c0519;
      color: #fb7185;
    }

    .status-icon {
      font-size: 26px;
      width: 26px;
      height: 26px;
    }

    .holding-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--title-color);
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.02em;
    }

    .holding-subtitle {
      font-size: 0.875rem;
      color: var(--subtitle-color);
      margin: 0 0 1.25rem 0;
      line-height: 1.5;
    }

    .user-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.875rem;
      background-color: var(--chip-bg);
      color: var(--chip-color);
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 500;
      margin-bottom: 2rem;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chip-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .chip-text {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .holding-actions {
      width: 100%;
    }

    .logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--btn-color);
      background-color: var(--btn-bg);
      border: 1px solid transparent;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    .logout-btn:hover {
      background-color: var(--btn-hover-bg);
      box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.12);
      transform: translateY(-1px);
    }

    .logout-btn:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }

    .holding-footer {
      margin-top: 2rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--footer-border);
      width: 100%;
    }

    .help-note {
      font-size: 0.75rem;
      color: var(--note-color);
      line-height: 1.4;
    }
  `],
})
export class NoProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly userEmail = this.auth.email;

  private readonly reason = computed(() => {
    return this.route.snapshot.queryParamMap.get('reason')?.toLowerCase() ?? null;
  });

  readonly isSuspended = computed(() => this.reason() === 'suspended');

  readonly title = computed(() => {
    const r = this.reason();
    if (r === 'suspended') {
      return 'Account Suspended';
    }
    if (r === 'inactive') {
      return 'Account Inactive';
    }
    if (r === 'pending_activation' || r === 'pending') {
      return 'Account Pending Activation';
    }
    return 'No Employee Profile';
  });

  readonly description = computed(() => {
    const r = this.reason();
    if (r === 'suspended') {
      return 'Your employee account is currently suspended. Please log out and contact your HR administrator.';
    }
    if (r === 'inactive') {
      return 'Your employee account is inactive. Please log out and contact your administrator.';
    }
    if (r === 'pending_activation' || r === 'pending') {
      return 'Your account is pending activation. Please log out until your profile is approved.';
    }
    return 'No employee profile exists for your email address. Please log out until an administrator creates your employee profile.';
  });

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
    }
  }

  onSignOut(): void {
    this.auth.logout();
  }
}
