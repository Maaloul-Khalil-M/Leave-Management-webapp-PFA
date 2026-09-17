import { Component, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { UpcomingLeave, Holiday } from '../../models';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge';

@Component({
  selector: 'app-schedule-tabs',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatIconModule,
    DatePipe,
    StatusBadgeComponent
  ],
  templateUrl: './schedule-tabs.component.html',
  styleUrl: './schedule-tabs.component.scss'
})
export class ScheduleTabsComponent {
  readonly upcomingLeaves = input<UpcomingLeave[]>([]);
  readonly holidays = input<Holiday[]>([]);
}
