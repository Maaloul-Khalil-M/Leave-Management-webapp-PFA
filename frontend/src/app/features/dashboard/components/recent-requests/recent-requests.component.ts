import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';
import { LeaveRequest } from '../../models';
import { LeaveRequestService } from '../../../../core/services/leave-request.service';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge';

@Component({
  selector: 'app-recent-requests',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    DatePipe,
    StatusBadgeComponent
  ],
  templateUrl: './recent-requests.component.html',
  styleUrl: './recent-requests.component.scss'
})
export class RecentRequestsComponent {
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly dashboardStateService = inject(DashboardStateService);

  readonly items = input<LeaveRequest[]>([]);
  readonly submittingId = signal<string | null>(null);
  readonly cancellingId = signal<string | null>(null);

  submitDraft(id: string): void {
    this.submittingId.set(id);
    this.leaveRequestService.submit(id).subscribe({
      next: () => {
        this.submittingId.set(null);
        this.dashboardStateService.loadDashboard();
      },
      error: (err) => {
        this.submittingId.set(null);
        console.error('Failed to submit leave request from dashboard', err);
      }
    });
  }

  cancelRequest(id: string): void {
    if (!confirm('Are you sure you want to cancel this leave request?')) {
      return;
    }
    this.cancellingId.set(id);
    this.leaveRequestService.cancel(id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.dashboardStateService.loadDashboard();
      },
      error: (err) => {
        this.cancellingId.set(null);
        console.error('Failed to cancel leave request from dashboard', err);
      }
    });
  }
}
