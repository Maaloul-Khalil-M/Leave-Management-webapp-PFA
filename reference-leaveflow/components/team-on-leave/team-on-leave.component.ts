import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { DatePipe } from '@angular/common';
import { TeamMemberOnLeave } from '../../models';

@Component({
  selector: 'app-team-on-leave',
  standalone: true,
  imports: [MatCardModule, DatePipe],
  templateUrl: './team-on-leave.component.html',
  styleUrl: './team-on-leave.component.scss'
})
export class TeamOnLeaveComponent {
  readonly items = input<TeamMemberOnLeave[]>([]);
}
