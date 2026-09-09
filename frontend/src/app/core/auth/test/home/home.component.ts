import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { MeService, MeResponse } from '../me/me.service';

/**
 * Routed page (path: ''). Rendered by AppComponent's <router-outlet />.
 * Uses Router / RouterLink for /hr and /pending-setup — requires the root outlet.
 * Presentation only; auth + me state live in services.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [JsonPipe, RouterLink],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly meService = inject(MeService);
  private readonly router = inject(Router);

  readonly me = signal<MeResponse | null>(null);
  readonly result = signal<unknown>(null);
  readonly loading = signal(false);

  readonly isPending = computed(() => {
    const m = this.me();
    return m?.linked === true && m.employeeStatus === 'PENDING';
  });

  readonly isActive = computed(() => {
    const m = this.me();
    return m?.linked === true && m.employeeStatus === 'ACTIVE';
  });

  readonly displayRoles = computed(() => {
    const fromMe = this.me()?.roles;
    if (fromMe && fromMe.length) return fromMe;
    return this.auth.roles();
  });

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.loadMe();
    }
  }

  loadMe(): void {
    this.loading.set(true);
    this.meService.loadMe().subscribe({
      next: (response) => {
        this.me.set(response);
        this.result.set(response);
        this.loading.set(false);
        if (response.linked && response.employeeStatus === 'PENDING') {
          // optional: soft hint only — user can stay on home
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.result.set({
          error: error.status,
          message: error.message,
          body: error.error,
        });
      },
    });
  }

  callWork(): void {
    this.loading.set(true);
    this.meService.callWork().subscribe({
      next: (response) => {
        this.result.set(response);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.result.set({
          error: error.status,
          message: error.message,
          body: error.error,
        });
      },
    });
  }

  goPending(): void {
    this.router.navigateByUrl('/pending-setup');
  }
}
