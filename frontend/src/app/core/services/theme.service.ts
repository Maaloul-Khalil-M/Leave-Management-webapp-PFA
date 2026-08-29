import {effect, Injectable, signal} from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  mode =
    signal<ThemeMode>('dark');

  constructor() {
    const savedMode = localStorage.getItem('theme-mode'); // returns "light" from before

    if (savedMode === 'light' || savedMode === 'dark') {
      this.mode.set(savedMode); // overwrites your new 'dark' default back to 'light'
    }

    effect(() => {
      const mode = this.mode();

      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(mode);

      localStorage.setItem('theme-mode', mode);
    });
  }

  setMode(mode: ThemeMode) {
    this.mode.set(mode);
  }

  toggle() {
    this.mode.update(mode =>
      mode === 'light' ? 'dark' : 'light'
    );
  }
}
