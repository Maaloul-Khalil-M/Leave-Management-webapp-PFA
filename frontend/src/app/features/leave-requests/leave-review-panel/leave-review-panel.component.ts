import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  EligibilityResponse,
  Explanation,
  LeaveTypeCode,
  SupportingDocumentResponse,
} from '../../../core/services/leave-request.service';
import { AccrualUnit, formatDisplayDate } from '../leave-calculator';

export interface ReviewLeaveTypeMeta {
  code: LeaveTypeCode;
  title: string;
  icon: string;
  description: string;
  accrualUnit?: AccrualUnit;
}

@Component({
  selector: 'app-leave-review-panel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './leave-review-panel.component.html',
  styleUrl: './leave-review-panel.component.scss',
})
export class LeaveReviewPanelComponent {
  @Input({ required: true }) leaveTypeMeta!: ReviewLeaveTypeMeta;
  @Input({ required: true }) startDate = '';
  @Input({ required: true }) endDate = '';
  @Input() halfDayStart = false;
  @Input() halfDayEnd = false;
  @Input({ required: true }) durationDays = 0;
  @Input() reason = '';
  @Input() uploadedDocuments: SupportingDocumentResponse[] = [];

  @Input() employeeName = '';
  @Input() employeePosition = '';
  @Input() employeeDepartment = '';
  @Input() availableBalance = 0;

  @Input() eligibility: EligibilityResponse | null = null;
  @Input() checkingEligibility = false;
  @Input() submitting = false;
  @Input() submitMode: 'draft' | 'submit' | null = null;

  @Output() saveDraft = new EventEmitter<void>();
  @Output() submitForApproval = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();

  readonly formatDisplayDate = formatDisplayDate;

  get isCalendarDay(): boolean {
    return this.leaveTypeMeta?.accrualUnit === 'CALENDAR_DAY';
  }

  get durationUnitLabel(): string {
    const unit = this.isCalendarDay ? 'calendar day' : 'working day';
    return `${this.durationDays} ${unit}${this.durationDays === 1 ? '' : 's'}`;
  }

  get blockingExplanations(): Explanation[] {
    const elig = this.eligibility;
    if (!elig) return [];
    const fromExp = elig.explanations?.filter((e) => e.severity === 'BLOCKING') ?? [];
    if (fromExp.length > 0) return fromExp;

    // Fallback if backend returned reasons or blockingCode
    if (!elig.eligible && elig.reasons && elig.reasons.length > 0) {
      return elig.reasons.map((r) => ({
        code: elig.blockingCode || 'BLOCKING',
        severity: 'BLOCKING' as const,
        title: 'Eligibility Constraint',
        body: r,
      }));
    }
    if (!elig.eligible && elig.blockingCode) {
      return [{
        code: elig.blockingCode,
        severity: 'BLOCKING' as const,
        title: 'Eligibility Constraint',
        body: 'This request does not meet eligibility criteria (' + elig.blockingCode + ').',
      }];
    }
    if (!elig.eligible) {
      return [{
        code: 'ELIGIBILITY_FAILED',
        severity: 'BLOCKING' as const,
        title: 'Eligibility Constraint',
        body: 'This request does not meet policy or balance requirements.',
      }];
    }
    return [];
  }

  get warningExplanations(): Explanation[] {
    return this.eligibility?.explanations?.filter((e) => e.severity === 'WARNING') ?? [];
  }

  get isPaidAnnual(): boolean {
    return this.leaveTypeMeta?.code === 'PAID_ANNUAL';
  }

  get currentAvailable(): number {
    if (this.eligibility?.availableBalance !== null && this.eligibility?.availableBalance !== undefined) {
      return this.eligibility.availableBalance;
    }
    return this.availableBalance;
  }

  get remainingAfter(): number {
    return +(this.currentAvailable - this.durationDays).toFixed(1);
  }

  get hasDeficit(): boolean {
    return this.isPaidAnnual && this.remainingAfter < 0;
  }

  get deficitAmount(): number {
    return +Math.abs(Math.min(0, this.remainingAfter)).toFixed(1);
  }

  get canSubmit(): boolean {
    if (this.submitting) return false;
    if (this.checkingEligibility) return false;
    if (this.eligibility && !this.eligibility.eligible) return false;
    return true;
  }
}