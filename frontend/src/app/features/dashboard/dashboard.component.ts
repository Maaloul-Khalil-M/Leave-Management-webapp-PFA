import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardStateService } from './services/dashboard-state.service';
import { HeaderComponent } from './components/header/header.component';
import { ProfileSummaryComponent } from './components/profile-summary/profile-summary.component';
import { LeaveBalanceComponent } from './components/leave-balance/leave-balance.component';
import { BalanceCalculationComponent } from './components/balance-calculation/balance-calculation.component';
import { RecentRequestsComponent } from './components/recent-requests/recent-requests.component';
import { LeaveLedgerComponent } from './components/leave-ledger/leave-ledger.component';
import { UpcomingLeavesComponent } from './components/upcoming-leaves/upcoming-leaves.component';
import { CompanyHolidaysComponent } from './components/company-holidays/company-holidays.component';
import { CalendarViewComponent } from './components/calendar-view/calendar-view.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    HeaderComponent,
    ProfileSummaryComponent,
    LeaveBalanceComponent,
    BalanceCalculationComponent,
    RecentRequestsComponent,
    LeaveLedgerComponent,
    UpcomingLeavesComponent,
    CompanyHolidaysComponent,
    CalendarViewComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  readonly state = inject(DashboardStateService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.state.loadDashboard();
  }

  onRequestLeave(): void {
    this.router.navigate(['/leave-requests']);
  }

  onSignOut(): void {
    this.auth.logout();
  }
}
