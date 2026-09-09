import {Component, inject, OnInit, signal, computed} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {MeService, UserResponse} from '../me.service';
import {AuthService} from '../../auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly meService = inject(MeService);

  readonly me = signal<UserResponse | null>(null);
  readonly result = signal<unknown>(null);
  readonly loading = signal(false);

  readonly isActive = computed(() => {
    return this.me()?.accountStatus === 'ACTIVE';
  });

  readonly displayRoles = computed(() => {
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
}
