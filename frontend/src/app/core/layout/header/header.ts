import {Component} from '@angular/core';
import {MatToolbar} from '@angular/material/toolbar';
import {MatButton, MatIconButton} from '@angular/material/button';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {MatMenu, MatMenuItem, MatMenuTrigger} from '@angular/material/menu';
import {MatIcon} from '@angular/material/icon';
import {MatBadge} from '@angular/material/badge';

//import {ThemeSwitcher} from '../theme-switcher/theme-switcher';

@Component({
  selector: 'app-header',
  imports: [
    MatToolbar,
    MatIconButton,
    RouterLink,
    MatMenu,
    MatIcon,
    MatMenuTrigger,
    MatMenuItem,
    RouterLinkActive,
    MatButton,
    MatBadge,
  ],
  template: `
    <mat-toolbar class="header-toolbar">

      <!-- Mobile menu button -->
      <button
        [matMenuTriggerFor]="menu"
        class="mobile-menu"
        matIconButton>

        <mat-icon>menu</mat-icon>
      </button>


      <!-- Application logo -->
      <a
        class="brand"
        routerLink="/">

        <img
          alt="Platana"
          class="brand-logo"
          src="LOGO.png"
        />
      </a>


      <!-- Desktop navigation -->
      <nav class="nav-links">

        <!-- Home -->
        <a
          [routerLinkActiveOptions]="{ exact: true }"
          mat-button
          routerLink="/"
          routerLinkActive="active">
          Home
        </a>

        <!-- Settings -->
        <a
          mat-button
          routerLink="/settings"
          routerLinkActive="active">
          Settings
        </a>

      </nav>

      <!-- Push actions to the right -->
      <span class="toolbar-spacer"></span>

      <!-- <app-theme-switcher/> -->

      <!-- Header actions -->
      <div class="header-actions">

        <!-- Notifications button -->
        <button
          [matMenuTriggerFor]="notificationMenu"
          class="notif-btn"
          mat-icon-button>

          <mat-icon
            matBadge="3"
            matBadgeColor="warn"
            matBadgeSize="small">

            notifications

          </mat-icon>

        </button>

      </div>

    </mat-toolbar>


    <!-- Mobile navigation menu -->
    <mat-menu #menu="matMenu">

      <!-- Home -->
      <button
        mat-menu-item
        routerLink="/">

        <mat-icon>home</mat-icon>
        <span>Home</span>

      </button>


      <!-- Settings -->
      <button
        mat-menu-item
        routerLink="/settings">

        <mat-icon>settings</mat-icon>
        <span>Settings</span>

      </button>

    </mat-menu>


    <!-- Notifications menu -->
    <mat-menu #notificationMenu="matMenu">

      <!-- Notification 1 -->
      <button mat-menu-item>
        <mat-icon>info</mat-icon>

        <span>
      You have a new notification
    </span>
      </button>


      <!-- Notification 2 -->
      <button mat-menu-item>
        <mat-icon>check_circle</mat-icon>

        <span>
      Your request has been completed
    </span>
      </button>


      <!-- Notification 3 -->
      <button mat-menu-item>
        <mat-icon>settings</mat-icon>

        <span>
      Your settings were updated
    </span>
      </button>

    </mat-menu>

  `,
  styleUrls: ['./header.scss'],
  host: {
    class: 'shrink-0',
  },
})
export class Header {
}
