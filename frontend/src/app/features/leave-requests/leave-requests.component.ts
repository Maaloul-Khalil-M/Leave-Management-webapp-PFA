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
  EligibilityResponse,
  Explanation,
} from '../../core/services/leave-request.service';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardStateService } from '../dashboard/services/dashboard-state.service';
import { calculateWorkingDays, formatDisplayDate } from './leave-calculator';

export interface LeaveTypeItem {
  code: LeaveTypeCode;
  title: string;
  icon: string;
  description: string;
  policyHint: string;
}

export const LEAVE_TYPES_METADATA: LeaveTypeItem[] = [
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

import { HeaderComponent } from '../../core/layout/header/header.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge';
import { LeaveReviewPanelComponent } from './leave-review-panel/leave-review-panel.component';

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    StatusBadgeComponent,
    LeaveReviewPanelComponent,
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
  readonly cancellingId = signal<string | null>(null);
  readonly lastCreatedRequest = signal<LeaveRequestResponse | null>(null);

  // Data & Message state
  readonly requests = signal<LeaveRequestResponse[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  logoError = false;

  // Fully reactive Form signals
  readonly leaveTypeCode = signal<LeaveTypeCode>('PAID_ANNUAL');
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');
  readonly halfDayStart = signal<boolean>(false);
  readonly halfDayEnd = signal<boolean>(false);
  readonly reason = signal<string>('');
  readonly eligibility = signal<EligibilityResponse | null>(null);
  readonly checkingEligibility = signal<boolean>(false);

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
    const code = this.leaveTypeCode();
    return (
      LEAVE_TYPES_METADATA.find((m) => m.code === code) ||
      LEAVE_TYPES_METADATA[0]
    );
  });

  readonly calculatedDuration = computed(() => {
    return calculateWorkingDays(
      this.startDate(),
      this.endDate(),
      this.halfDayStart(),
      this.halfDayEnd()
    );
  });

  readonly step1Valid = computed(() => !!this.leaveTypeCode());

  readonly step2Valid = computed(() => {
    const start = this.startDate();
    const end = this.endDate();
    if (!start || !end) return false;
    if (end < start) return false;
    if (this.calculatedDuration() <= 0) return false;
    if (this.leaveTypeCode() === 'UNPAID' && !this.reason().trim()) {
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
    this.leaveTypeCode.set(code);
    this.eligibility.set(null);
  }

  fetchEligibility(): void {
    if (!this.step1Valid() || !this.step2Valid()) return;
    this.checkingEligibility.set(true);
    const payload = {
      leaveTypeCode: this.leaveTypeCode(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      halfDayStart: this.halfDayStart(),
      halfDayEnd: this.halfDayEnd(),
    };
    this.leaveRequestService.checkEligibility(payload).subscribe({
      next: (res) => {
        this.eligibility.set(res);
        this.checkingEligibility.set(false);
      },
      error: () => {
        this.checkingEligibility.set(false);
      },
    });
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
    if (nextIndex === 2) {
      this.fetchEligibility();
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
      if (index === 2) {
        this.fetchEligibility();
      }
    }
  }

  onStepperSelectionChange(index: number): void {
    this.activeStep.set(index);
  }

  // ─── Date Picker Helpers ──────────────────────────────────
  startDateAsDate(): Date | null {
    const s = this.startDate();
    if (!s) return null;
    const parts = s.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }

  endDateAsDate(): Date | null {
    const s = this.endDate();
    if (!s) return null;
    const parts = s.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }

  onStartDateChange(d: Date | null): void {
    this.startDate.set(this.toIsoDate(d));
    this.eligibility.set(null);
  }

  onEndDateChange(d: Date | null): void {
    this.endDate.set(this.toIsoDate(d));
    this.eligibility.set(null);
  }

  private toIsoDate(d: Date | null): string {
    if (!d || isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private buildPayload(): CreateLeaveRequest {
    return {
      leaveTypeCode: this.leaveTypeCode(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      halfDayStart: this.halfDayStart(),
      halfDayEnd: this.halfDayEnd(),
      reason: this.reason().trim() || undefined,
    };
  }

  // ─── Submissions ──────────────────────────────────────────
  saveDraft(): void {
    if (!this.isReadyToSubmit()) return;

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);
    this.submitMode.set('draft');

    this.leaveRequestService.createDraft(this.buildPayload()).subscribe({
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

    this.leaveRequestService.createDraft(this.buildPayload()).subscribe({
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
            this.lastCreatedRequest.set(created);
            const detailMsg = submitErr?.error?.error?.details?.[0]?.message;
            this.errorMessage.set(
              `Draft saved (#${created.id}), but submission was blocked: ${
                detailMsg || submitErr?.error?.error?.message || submitErr?.error?.message || 'Not eligible'
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

  cancelRequest(id: string): void {
    if (!confirm('Are you sure you want to cancel this leave request?')) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.cancellingId.set(id);

    this.leaveRequestService.cancel(id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.successMessage.set('Leave request cancelled successfully.');
        this.loadRequests();
        this.dashboardState.loadDashboard();
      },
      error: (err) => {
        this.cancellingId.set(null);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'Failed to cancel leave request.'
        );
      },
    });
  }

  resetAndCreateAnother(): void {
    this.leaveTypeCode.set('PAID_ANNUAL');
    this.startDate.set('');
    this.endDate.set('');
    this.halfDayStart.set(false);
    this.halfDayEnd.set(false);
    this.reason.set('');
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
