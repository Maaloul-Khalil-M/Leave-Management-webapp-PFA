import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { LeaveRequest } from '../../models';

@Component({
  selector: 'app-recent-requests',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, DatePipe],
  templateUrl: './recent-requests.component.html',
  styleUrl: './recent-requests.component.scss'
})
export class RecentRequestsComponent {
  readonly items = input<LeaveRequest[]>([]);
}
