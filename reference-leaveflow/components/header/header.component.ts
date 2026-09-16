import { Component, input, output } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Attendance, Profile } from '../../models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatButtonToggleModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  readonly profile = input<Profile | null>(null);
  readonly attendance = input<Attendance | null>(null);

  readonly requestLeave = output<void>();
  readonly viewProfile = output<void>();
  readonly statusChange = output<'Office' | 'Remote'>();

  onStatusChange(value: string): void {
    if (value === 'Office' || value === 'Remote') {
      this.statusChange.emit(value);
    }
  }
}
