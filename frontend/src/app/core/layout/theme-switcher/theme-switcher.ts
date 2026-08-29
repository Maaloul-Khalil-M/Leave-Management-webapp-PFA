import {Component, inject, ViewEncapsulation} from '@angular/core';
import {MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatTooltip} from '@angular/material/tooltip';
import {ThemeService} from '../../services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  imports: [MatIconButton, MatIcon, MatTooltip],
  encapsulation: ViewEncapsulation.None,
  template: `
    <button
      mat-icon-button
      class="theme-switcher"
      type="button"
      [attr.aria-pressed]="isDark()"
      [attr.aria-label]="isDark() ? 'Switch to light theme' : 'Switch to dark theme'"
      [matTooltip]="isDark() ? 'Light mode' : 'Dark mode'"
      (click)="toggle()"
    >
      <span class="theme-switcher__stack" aria-hidden="true">
        <mat-icon
          class="theme-switcher__icon theme-switcher__icon--light"
          [class.is-active]="!isDark()"
        >light_mode</mat-icon>
        <mat-icon
          class="theme-switcher__icon theme-switcher__icon--dark"
          [class.is-active]="isDark()"
        >dark_mode</mat-icon>
      </span>
    </button>
  `,
  styles: `
    .theme-switcher {
      position: relative;
      overflow: visible;
    }

    .theme-switcher .mat-mdc-button-persistent-ripple,
    .theme-switcher .mdc-icon-button__ripple {
      z-index: 0;
    }

    .theme-switcher__stack {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      pointer-events: none;
    }

    .theme-switcher__icon {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      font-size: 24px;
      line-height: 24px;
      text-align: center;
      opacity: 0;
      transform: scale(0.5);
      transform-origin: center center;
      transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1),
      transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
      will-change: opacity, transform;
    }

    .theme-switcher__icon.is-active {
      opacity: 1;
      transform: scale(1);
    }

    .theme-switcher__icon--light.is-active {
      color: #fbbf24;
    }

    .theme-switcher__icon--dark.is-active {
      color: #a5b4fc;
    }

    @media (prefers-reduced-motion: reduce) {
      .theme-switcher__icon {
        transition: opacity 120ms linear;
        transform: none;
      }
    }

    
  `,
})
export class ThemeSwitcher {
  protected readonly themeService = inject(ThemeService);

  protected isDark(): boolean {
    return this.themeService.mode() === 'dark';
  }

  protected toggle(): void {
    this.themeService.setMode(this.isDark() ? 'light' : 'dark');
  }
}
