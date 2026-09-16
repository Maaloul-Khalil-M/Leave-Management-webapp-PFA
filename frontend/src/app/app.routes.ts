import {Routes} from '@angular/router';
import {HomeComponent} from './core/auth/test/home/home.component';
import {employeeGuard} from './core/auth/employee.guard';

export const routes: Routes = [
  {path: '', component: HomeComponent},
  {
    path: 'leave-requests',
    loadComponent: () =>
      import('./features/leave-requests/leave-requests.component').then(
        (m) => m.LeaveRequestsComponent
      ),
    canActivate: [employeeGuard],
  },
];
