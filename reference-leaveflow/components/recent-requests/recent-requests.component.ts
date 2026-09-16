import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { DatePipe } from '@angular/common';
import { LeaveRequest } from '../../models';

@Component({
  selector: 'app-recent-requests',
  standalone: true,
  imports: [MatCardModule, MatChipsModule, DatePipe],
  templateUrl: './recent-requests.component.html',
  styleUrl: './recent-requests.component.scss'
})
export class RecentRequestsComponent {
  readonly items = input<LeaveRequest[]>([]);
}
