import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { UpcomingLeave } from '../../models';

@Component({
  selector: 'app-upcoming-leaves',
  standalone: true,
  imports: [MatCardModule, MatChipsModule, MatIconModule, DatePipe],
  templateUrl: './upcoming-leaves.component.html',
  styleUrl: './upcoming-leaves.component.scss'
})
export class UpcomingLeavesComponent {
  readonly items = input<UpcomingLeave[]>([]);
}
