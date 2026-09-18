import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LeaveRequestResponse, LeaveTypeCode } from '../../../../core/services/leave-request.service';

export interface ApprovalDecisionDialogData {
  action: 'approve' | 'reject';
  requests: LeaveRequestResponse[];
}

export interface ApprovalDecisionDialogResult {
  confirmed: boolean;
  comment?: string;
}

@Component({
  selector: 'app-approval-decision-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="decision-dialog-container">
      <div class="dialog-header" [class.reject-header]="data.action === 'reject'">
        <div class="header-icon-wrap" [class.reject-icon]="data.action === 'reject'">
          <mat-icon>{{ data.action === 'approve' ? 'task_alt' : 'cancel' }}</mat-icon>
        </div>
        <div>
          <h2 mat-dialog-title class="dialog-title">
            {{ data.action === 'approve' ? 'Approve' : 'Reject' }}
            {{ data.requests.length === 1 ? 'Leave Request' : data.requests.length + ' Leave Requests' }}
          </h2>
          <p class="dialog-subtitle">
            @if (data.action === 'approve') {
              Confirm approval of the selected leave {{ data.requests.length === 1 ? 'request' : 'requests' }}.
            } @else {
              Provide a reason to inform the employee{{ data.requests.length === 1 ? '' : 's' }} of the rejection.
            }
          </p>
        </div>
      </div>

      <mat-dialog-content class="dialog-body">
        <!-- Single Request Details Summary -->
        @if (data.requests.length === 1) {
          @let req = data.requests[0];
          <div class="summary-card">
            <div class="summary-row">
              <span class="label">Employee</span>
              <span class="value font-semibold">{{ getEmployeeName(req) }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Leave Type</span>
              <span class="value">{{ formatType(req.leaveTypeCode) }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Dates</span>
              <span class="value">{{ req.startDate }} → {{ req.endDate }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Duration</span>
              <span class="value font-semibold">{{ req.durationDays }} {{ req.durationDays === 1 ? 'day' : 'days' }}</span>
            </div>
            @if (req.reason) {
              <div class="summary-row reason-row">
                <span class="label">Employee Note</span>
                <span class="value italic">"{{ req.reason }}"</span>
              </div>
            }
          </div>
        } @else {
          <!-- Batch Request Summary -->
          <div class="batch-summary-card">
            <div class="batch-count-badge">
              <mat-icon>checklist</mat-icon>
              <span>{{ data.requests.length }} requests selected for batch {{ data.action }}</span>
            </div>
            <div class="batch-preview-list">
              @for (req of data.requests; track req.id) {
                <div class="batch-item">
                  <span class="batch-emp">{{ getEmployeeName(req) }}</span>
                  <span class="batch-meta">{{ formatType(req.leaveTypeCode) }} • {{ req.durationDays }}d ({{ req.startDate }})</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Decision Comment Field -->
        <div class="comment-field-wrap">
          <label class="input-label" [class.required]="data.action === 'reject'">
            {{ data.action === 'approve' ? 'Manager Comment (Optional)' : 'Rejection Reason (Required)' }}
          </label>
          <textarea
            [(ngModel)]="comment"
            [placeholder]="data.action === 'approve' ? 'Add any notes, conditions, or handoff instructions...' : 'Please specify why this leave request cannot be approved...'"
            rows="3"
            class="dialog-textarea"
            [class.invalid]="data.action === 'reject' && attemptedSubmit && !comment.trim()"
          ></textarea>
          @if (data.action === 'reject' && attemptedSubmit && !comment.trim()) {
            <span class="validation-error">A reason is required when rejecting leave requests.</span>
          }
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()" class="cancel-btn">
          Cancel
        </button>
        <button
          mat-flat-button
          type="button"
          [color]="data.action === 'approve' ? 'primary' : 'warn'"
          (click)="onConfirm()"
          [class.approve-submit]="data.action === 'approve'"
          [class.reject-submit]="data.action === 'reject'"
        >
          <mat-icon>{{ data.action === 'approve' ? 'check' : 'close' }}</mat-icon>
          {{ data.action === 'approve' ? 'Approve' : 'Reject' }}
          {{ data.requests.length > 1 ? '(' + data.requests.length + ')' : '' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .decision-dialog-container {
      padding: 6px;
      min-width: 440px;
      max-width: 540px;
    }

    .dialog-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px 8px;

      .header-icon-wrap {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: #ecfdf5;
        color: #059669;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &.reject-icon {
          background: #fef2f2;
          color: #dc2626;
        }

        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }

      .dialog-title {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.25;
      }

      .dialog-subtitle {
        margin: 4px 0 0;
        font-size: 12px;
        color: #64748b;
      }
    }

    .dialog-body {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 60vh;
      overflow-y: auto;
    }

    .summary-card, .batch-summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 12px;

      &:not(:last-child) {
        border-bottom: 1px solid #f1f5f9;
      }

      .label {
        color: #64748b;
        font-weight: 500;
      }

      .value {
        color: #1e293b;
        text-align: right;
      }

      &.reason-row {
        align-items: flex-start;
        flex-direction: column;
        gap: 2px;
        padding-top: 6px;

        .value {
          text-align: left;
          color: #475569;
        }
      }
    }

    .batch-count-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 8px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #2563eb;
      }
    }

    .batch-preview-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 140px;
      overflow-y: auto;
    }

    .batch-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 11px;

      .batch-emp {
        font-weight: 600;
        color: #0f172a;
      }

      .batch-meta {
        color: #64748b;
      }
    }

    .comment-field-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .input-label {
        font-size: 12px;
        font-weight: 600;
        color: #334155;

        &.required::after {
          content: ' *';
          color: #dc2626;
        }
      }

      .dialog-textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 8px 10px;
        font-size: 12px;
        font-family: inherit;
        color: #0f172a;
        background: #ffffff;
        resize: vertical;
        outline: none;
        transition: border-color 0.15s ease;

        &:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }

        &.invalid {
          border-color: #dc2626;
          background: #fff5f5;
        }
      }

      .validation-error {
        font-size: 11px;
        color: #dc2626;
        font-weight: 500;
      }
    }

    .dialog-actions {
      padding: 10px 16px 14px;
      gap: 8px;

      .cancel-btn {
        color: #64748b;
        font-weight: 600;
      }

      .approve-submit {
        background: #059669;
        color: #ffffff;
      }

      .reject-submit {
        background: #dc2626;
        color: #ffffff;
      }
    }
  `]
})
export class ApprovalDecisionDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ApprovalDecisionDialogComponent>);
  readonly data: ApprovalDecisionDialogData = inject(MAT_DIALOG_DATA);

  comment = '';
  attemptedSubmit = false;

  getEmployeeName(req: LeaveRequestResponse): string {
    const snap = req.employeeSnapshot;
    if (snap && (snap.firstName || snap.lastName)) {
      return `${snap.firstName || ''} ${snap.lastName || ''}`.trim();
    }
    return req.employeeId;
  }

  formatType(code: LeaveTypeCode): string {
    switch (code) {
      case 'PAID_ANNUAL':
        return 'Paid Annual';
      case 'SICK':
        return 'Sick Leave';
      case 'UNPAID':
        return 'Unpaid Leave';
      case 'MATERNITY':
        return 'Maternity';
      default:
        return code;
    }
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }

  onConfirm(): void {
    this.attemptedSubmit = true;
    if (this.data.action === 'reject' && !this.comment.trim()) {
      return;
    }
    this.dialogRef.close({
      confirmed: true,
      comment: this.comment.trim() || undefined,
    });
  }
}
