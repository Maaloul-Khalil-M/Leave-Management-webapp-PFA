import {Routes} from '@angular/router';
import {HomeComponent} from './core/auth/test/home/home.component';
import {employeeGuard} from './core/auth/employee.guard';

export const routes: Routes = [
  {path: '', pathMatch: 'full', redirectTo: 'dashboard'},
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    canActivate: [employeeGuard],
  },
  {
    path: 'leave-requests',
    loadComponent: () =>
      import('./features/leave-requests/leave-requests.component').then(
        (m) => m.LeaveRequestsComponent
      ),
    canActivate: [employeeGuard],
  },
  {
    path: 'manager/approvals',
    loadComponent: () =>
      import('./features/manager-approvals/manager-approvals.component').then(
        (m) => m.ManagerApprovalsComponent
      ),
    canActivate: [employeeGuard],
  },
  {
    path: 'dev/auth-test',
    component: HomeComponent,
  },
];
