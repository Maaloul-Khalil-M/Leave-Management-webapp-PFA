import {effect, Injectable, signal} from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly mode = signal<ThemeMode>('light');

  constructor() {
    const savedMode = localStorage.getItem('theme-mode');

    if (savedMode === 'light' || savedMode === 'dark') {
      this.mode.set(savedMode);
    } else {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
      this.mode.set(prefersDark ? 'dark' : 'light');
    }

    // Apply class immediately
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(this.mode());

    effect(() => {
      const current = this.mode();
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(current);
      localStorage.setItem('theme-mode', current);
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  toggle(): void {
    this.mode.update((m) => (m === 'light' ? 'dark' : 'light'));
  }
}
