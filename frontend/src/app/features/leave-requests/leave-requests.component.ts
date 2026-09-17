import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatDividerModule } from '@angular/material/divider';

import {
  LeaveRequestService,
  CreateLeaveRequest,
  LeaveRequestResponse,
  LeaveTypeCode,
} from '../../core/services/leave-request.service';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardStateService } from '../dashboard/services/dashboard-state.service';
import { calculateWorkingDays, formatDisplayDate } from './leave-calculator';

interface LeaveTypeItem {
  code: LeaveTypeCode;
  title: string;
  icon: string;
  description: string;
  policyHint: string;
}

const LEAVE_TYPES_METADATA: LeaveTypeItem[] = [
  {
    code: 'PAID_ANNUAL',
    title: 'Paid Annual',
    icon: 'beach_access',
    description: 'Standard paid vacation and accrued personal time off',
    policyHint:
      'Paid annual leave accrues monthly and deducts directly from your approved leave balance.',
  },
  {
    code: 'SICK',
    title: 'Sick Leave',
    icon: 'medical_services',
    description: 'Absence due to illness, medical visits, or recovery',
    policyHint:
      'Sick leave covers periods of medical incapacity. Standard medical certification may be requested.',
  },
  {
    code: 'UNPAID',
    title: 'Unpaid Leave',
    icon: 'event_busy',
    description: 'Approved time off without salary compensation',
    policyHint:
      'Unpaid leave is subject to manager review and requires a reason to be specified.',
  },
  {
    code: 'MATERNITY',
    title: 'Maternity Leave',
    icon: 'family_restroom',
    description: 'Statutory maternity or parental leave',
    policyHint:
      'Statutory leave for maternity. Does not deduct from your annual vacation balance.',
  },
];

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatStepperModule,
    MatDividerModule,
  ],
  templateUrl: './leave-requests.component.html',
  styleUrl: './leave-requests.component.scss',
})
export class LeaveRequestsComponent implements OnInit {
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly dashboardState = inject(DashboardStateService);
  readonly auth = inject(AuthService);

  readonly stepper = viewChild(MatStepper);

  // Stepper Definition
  readonly steps = [
    { index: 0, label: 'Leave Type', icon: 'category' },
    { index: 1, label: 'Leave Details', icon: 'event' },
    { index: 2, label: 'Review', icon: 'rate_review' },
  ];

  readonly leaveTypesList = LEAVE_TYPES_METADATA;

  // View state
  readonly activeTab = signal<'new' | 'history'>('new');
  readonly activeStep = signal(0);
  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly submitMode = signal<'draft' | 'submit' | null>(null);
  readonly submittingId = signal<string | null>(null);
  readonly lastCreatedRequest = signal<LeaveRequestResponse | null>(null);

  // Data & Message state
  readonly requests = signal<LeaveRequestResponse[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  logoError = false;

  // Form model strictly conforming to CreateLeaveRequest
  form: CreateLeaveRequest = {
    leaveTypeCode: 'PAID_ANNUAL',
    startDate: '',
    endDate: '',
    halfDayStart: false,
    halfDayEnd: false,
    reason: '',
  };

  // Profile and balance info from DashboardState
  readonly employeeName = computed(() => {
    const prof = this.dashboardState.profile();
    return prof?.name || 'Employee';
  });

  readonly employeePosition = computed(() => {
    const prof = this.dashboardState.profile();
    return prof?.position || 'Team Member';
  });

  readonly employeeDepartment = computed(() => {
    const prof = this.dashboardState.profile();
    return prof?.department || 'General';
  });

  readonly availableAnnualBalance = computed(() => {
    const balances = this.dashboardState.leaveBalances();
    const annual = balances.find((b) => b.code === 'PAID_ANNUAL');
    return annual ? annual.remaining : 25;
  });

  readonly currentTypeMeta = computed<LeaveTypeItem>(() => {
    return (
      LEAVE_TYPES_METADATA.find((m) => m.code === this.form.leaveTypeCode) ||
      LEAVE_TYPES_METADATA[0]
    );
  });

  readonly calculatedDuration = computed(() => {
    return calculateWorkingDays(
      this.form.startDate,
      this.form.endDate,
      this.form.halfDayStart,
      this.form.halfDayEnd
    );
  });

  readonly step1Valid = computed(() => !!this.form.leaveTypeCode);

  readonly step2Valid = computed(() => {
    if (!this.form.startDate || !this.form.endDate) return false;
    if (this.form.endDate < this.form.startDate) return false;
    if (this.calculatedDuration() <= 0) return false;
    if (this.form.leaveTypeCode === 'UNPAID' && !this.form.reason?.trim()) {
      return false;
    }
    return true;
  });

  readonly isReadyToSubmit = computed(() => this.step1Valid() && this.step2Valid());

  ngOnInit(): void {
    this.loadRequests();
    if (!this.dashboardState.profile()) {
      this.dashboardState.loadDashboard();
    }
  }

  // ─── Data Loading ─────────────────────────────────────────
  loadRequests(): void {
    this.loading.set(true);
    this.leaveRequestService.listMine().subscribe({
      next: (res) => {
        this.requests.set(res.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to load leave requests');
      },
    });
  }

  // ─── Tab Switching ────────────────────────────────────────
  setActiveTab(tab: 'new' | 'history'): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
  }

  // ─── Stepper Navigation ───────────────────────────────────
  selectLeaveType(code: LeaveTypeCode): void {
    this.form.leaveTypeCode = code;
  }

  goNext(): void {
    const current = this.activeStep();
    if (current === 0 && !this.step1Valid()) return;
    if (current === 1 && !this.step2Valid()) return;

    const nextIndex = Math.min(current + 1, 2);
    this.activeStep.set(nextIndex);
    const stepperInstance = this.stepper();
    if (stepperInstance) {
      stepperInstance.selectedIndex = nextIndex;
    }
  }

  goBack(): void {
    const prevIndex = Math.max(this.activeStep() - 1, 0);
    this.activeStep.set(prevIndex);
    const stepperInstance = this.stepper();
    if (stepperInstance) {
      stepperInstance.selectedIndex = prevIndex;
    }
  }

  isStepClickable(index: number): boolean {
    if (this.submitted()) return false;
    if (index === 0) return true;
    if (index === 1) return this.step1Valid();
    if (index === 2) return this.step1Valid() && this.step2Valid();
    return false;
  }

  onStepClick(index: number): void {
    if (this.isStepClickable(index)) {
      this.activeStep.set(index);
      const stepperInstance = this.stepper();
      if (stepperInstance) {
        stepperInstance.selectedIndex = index;
      }
    }
  }

  onStepperSelectionChange(index: number): void {
    this.activeStep.set(index);
  }

  onFormValuesChanged(): void {
    // triggers reactivity
  }

  // ─── Date Picker Helpers ──────────────────────────────────
  startDateAsDate(): Date | null {
    if (!this.form.startDate) return null;
    const [y, m, d] = this.form.startDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  endDateAsDate(): Date | null {
    if (!this.form.endDate) return null;
    const [y, m, d] = this.form.endDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  onStartDateChange(d: Date | null): void {
    this.form.startDate = this.toIsoDate(d);
  }

  onEndDateChange(d: Date | null): void {
    this.form.endDate = this.toIsoDate(d);
  }

  private toIsoDate(d: Date | null): string {
    if (!d || isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ─── Submissions ──────────────────────────────────────────
  saveDraft(): void {
    if (!this.isReadyToSubmit()) return;

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);
    this.submitMode.set('draft');

    this.leaveRequestService.createDraft(this.form).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.submitMode.set(null);
        this.lastCreatedRequest.set(created);
        this.submitted.set(true);
        this.successMessage.set(
          `Draft created successfully with ID ${created.id} (${created.durationDays} days).`
        );
        this.loadRequests();
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitMode.set(null);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'Failed to create draft request.'
        );
      },
    });
  }

  submitForApproval(): void {
    if (!this.isReadyToSubmit()) return;

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);
    this.submitMode.set('submit');

    // First create the draft, then immediately submit it
    this.leaveRequestService.createDraft(this.form).subscribe({
      next: (created) => {
        this.leaveRequestService.submit(created.id).subscribe({
          next: (submitted) => {
            this.submitting.set(false);
            this.submitMode.set(null);
            this.lastCreatedRequest.set(submitted);
            this.submitted.set(true);
            this.successMessage.set(
              `Leave request submitted for approval (${submitted.durationDays} days).`
            );
            this.loadRequests();
          },
          error: (submitErr) => {
            this.submitting.set(false);
            this.submitMode.set(null);
            // Even if submit step fails, draft was created
            this.lastCreatedRequest.set(created);
            this.errorMessage.set(
              `Draft was created, but submission for approval failed: ${
                submitErr?.error?.message || 'Unknown error'
              }`
            );
            this.loadRequests();
          },
        });
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitMode.set(null);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'Failed to create leave request.'
        );
      },
    });
  }

  submitExistingDraft(id: string): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.submittingId.set(id);

    this.leaveRequestService.submit(id).subscribe({
      next: () => {
        this.submittingId.set(null);
        this.successMessage.set('Leave request submitted successfully for approval.');
        this.loadRequests();
      },
      error: (err) => {
        this.submittingId.set(null);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'Failed to submit leave request.'
        );
      },
    });
  }

  resetAndCreateAnother(): void {
    this.form = {
      leaveTypeCode: 'PAID_ANNUAL',
      startDate: '',
      endDate: '',
      halfDayStart: false,
      halfDayEnd: false,
      reason: '',
    };
    this.submitted.set(false);
    this.lastCreatedRequest.set(null);
    this.activeStep.set(0);
    const stepperInstance = this.stepper();
    if (stepperInstance) {
      stepperInstance.reset();
    }
  }

  // ─── Formatters ───────────────────────────────────────────
  formatType(code: LeaveTypeCode): string {
    const found = LEAVE_TYPES_METADATA.find((m) => m.code === code);
    return found ? found.title : code;
  }

  formatDisplayDate = formatDisplayDate;
}
