import { Component, OnInit, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardStateService } from '../services/dashboard-state.service';
import { HeaderComponent } from '../components/header/header.component';
import { ProfileSummaryComponent } from '../components/profile-summary/profile-summary.component';
import { UpcomingLeavesComponent } from '../components/upcoming-leaves/upcoming-leaves.component';
import { TeamOnLeaveComponent } from '../components/team-on-leave/team-on-leave.component';
import { LeaveBalanceComponent } from '../components/leave-balance/leave-balance.component';
import { BalanceCalculationComponent } from '../components/balance-calculation/balance-calculation.component';
import { RecentRequestsComponent } from '../components/recent-requests/recent-requests.component';
import { LeaveLedgerComponent } from '../components/leave-ledger/leave-ledger.component';
import { CalendarViewComponent } from '../components/calendar-view/calendar-view.component';
import { LeaveUtilizationComponent } from '../components/leave-utilization/leave-utilization.component';
import { CompanyHolidaysComponent } from '../components/company-holidays/company-holidays.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    HeaderComponent,
    ProfileSummaryComponent,
    UpcomingLeavesComponent,
    TeamOnLeaveComponent,
    LeaveBalanceComponent,
    BalanceCalculationComponent,
    RecentRequestsComponent,
    LeaveLedgerComponent,
    CalendarViewComponent,
    LeaveUtilizationComponent,
    CompanyHolidaysComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  readonly state = inject(DashboardStateService);

  ngOnInit(): void {
    this.state.loadDashboard();
  }

  onRequestLeave(): void {
    // Placeholder – no backend
    console.log('Request Leave clicked');
  }

  onViewProfile(): void {
    console.log('View Profile clicked');
  }

  onStatusChange(status: 'Office' | 'Remote'): void {
    console.log('Status changed to', status);
  }
}
