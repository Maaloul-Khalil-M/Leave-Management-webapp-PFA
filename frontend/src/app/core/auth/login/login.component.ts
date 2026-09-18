import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
  ],
  template: `
    <div class="login-page">

      <main class="login-container">
        <div class="login-card">
          <div class="login-header">
            <div class="brand-mark">
              <img src="/LOGO.png" alt="Platana" class="brand-logo" />
            </div>
            <h1 class="login-title">Leave management platform</h1>
            <p class="login-subtitle">
              Manage your leave requests, view company calendar, and access workforce resources.
            </p>
          </div>

          <div class="login-actions">
            <button
              type="button"
              class="google-btn"
              (click)="signInWithGoogle()"
            >
              <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <div class="login-footer">
            <span class="security-note">
              Protected by Keycloak OAuth 2.0
            </span>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
             :host {
               display: block;
               --login-bg: #f8fafc;
               --card-bg: #ffffff;
               --card-border: #e2e8f0;
               --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.08);
               --title-color: #0f172a;
               --subtitle-color: #64748b;
               --btn-bg: #ffffff;
               --btn-border: #cbd5e1;
               --btn-color: #1e293b;
               --btn-hover-bg: #f8fafc;
               --btn-hover-border: #94a3b8;
               --footer-border: #f1f5f9;
               --note-color: #94a3b8;
               --focus-ring: #2563eb;
             }

             :host-context(html.dark) {
               --login-bg: #0f172a;
               --card-bg: #1e293b;
               --card-border: #334155;
               --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
               --title-color: #f8fafc;
               --subtitle-color: #94a3b8;
               --btn-bg: #334155;
               --btn-border: #475569;
               --btn-color: #f8fafc;
               --btn-hover-bg: #3e4f66;
               --btn-hover-border: #64748b;
               --footer-border: #334155;
               --note-color: #64748b;
               --focus-ring: #60a5fa;
             }

             .login-page {
               min-height: 100vh;
               display: flex;
               flex-direction: column;
               background: var(--login-bg);
             }

             .login-container {
               flex: 1;
               display: flex;
               align-items: center;
               justify-content: center;
               padding: 2rem 1rem;
             }

             .login-card {
               width: 100%;
               max-width: 420px;
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

             .login-title {
               font-size: 1.5rem;
               font-weight: 700;
               color: var(--title-color);
               margin: 0 0 0.5rem 0;
               letter-spacing: -0.02em;
             }

             .login-subtitle {
               font-size: 0.875rem;
               color: var(--subtitle-color);
               margin: 0 0 2rem 0;
               line-height: 1.5;
             }

             .login-actions {
               width: 100%;
             }

             .google-btn {
               width: 100%;
               display: flex;
               align-items: center;
               justify-content: center;
               gap: 0.75rem;
               padding: 0.75rem 1.25rem;
               font-size: 0.9375rem;
               font-weight: 600;
               color: var(--btn-color);
               background-color: var(--btn-bg);
               border: 1px solid var(--btn-border);
               border-radius: 10px;
               cursor: pointer;
               transition: all 0.15s ease-in-out;
               box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
             }

             .google-btn:hover {
               background-color: var(--btn-hover-bg);
               border-color: var(--btn-hover-border);
               box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.08);
               transform: translateY(-1px);
             }

             .google-btn:focus-visible {
               outline: 2px solid var(--focus-ring);
               outline-offset: 2px;
             }

             .login-footer {
               margin-top: 2rem;
               padding-top: 1.25rem;
               border-top: 1px solid var(--footer-border);
               width: 100%;
             }

             .security-note {
               font-size: 0.75rem;
               color: var(--note-color);
             }
           `],
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  signInWithGoogle(): void {
    this.auth.loginWithGoogle();
  }
}
