import {Routes} from '@angular/router';
import {HomeComponent} from './core/auth/test/home/home.component';
import {employeeGuard} from './core/auth/employee.guard';
import {hrGuard} from './core/auth/hr.guard';

export const routes: Routes = [
  {path: '', pathMatch: 'full', redirectTo: 'dashboard'},
  {
    path: 'login',
    loadComponent: () =>
      import('./core/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'no-profile',
    loadComponent: () =>
      import('./core/auth/no-profile/no-profile.component').then(
        (m) => m.NoProfileComponent
      ),
  },
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
    path: 'management/employees',
    loadComponent: () =>
      import(
        './features/management/employee-management/employee-management.component'
      ).then((m) => m.EmployeeManagementComponent),
    canActivate: [hrGuard],
  },
  {
    path: 'management/organization',
    loadComponent: () =>
      import(
        './features/management/organization-management/organization-management.component'
      ).then((m) => m.OrganizationManagementComponent),
    canActivate: [hrGuard],
  },
  {
    path: 'management/analytics',
    loadComponent: () =>
      import(
        './features/management/hr-analytics/hr-analytics.component'
      ).then((m) => m.HrAnalyticsComponent),
    canActivate: [hrGuard],
  },
  {
    path: 'dev/auth-test',
    component: HomeComponent,
  },
];
