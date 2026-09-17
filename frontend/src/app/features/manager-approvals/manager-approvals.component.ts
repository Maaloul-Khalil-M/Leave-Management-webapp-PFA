import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LeaveRequestService,
  LeaveRequestResponse,
  LeaveTypeCode,
} from '../../core/services/leave-request.service';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../core/layout/header/header.component';

@Component({
  selector: 'app-manager-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './manager-approvals.component.html',
  styleUrl: './manager-approvals.component.scss',
})
export class ManagerApprovalsComponent implements OnInit {
  private readonly leaveRequestService = inject(LeaveRequestService);
  readonly auth = inject(AuthService);

  readonly pendingRequests = signal<LeaveRequestResponse[]>([]);
  readonly loading = signal(false);
  readonly processingId = signal<string | null>(null);
  readonly activeActionId = signal<string | null>(null);
  readonly currentAction = signal<'approve' | 'reject' | null>(null);
  decisionComment = '';

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPending();
  }

  loadPending(): void {
    this.loading.set(true);
    this.leaveRequestService.listPendingTeamRequests().subscribe({
      next: (res) => {
        this.pendingRequests.set(res.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'Failed to load team leave requests.'
        );
      },
    });
  }

  openApprove(id: string): void {
    this.activeActionId.set(id);
    this.currentAction.set('approve');
    this.decisionComment = '';
  }

  openReject(id: string): void {
    this.activeActionId.set(id);
    this.currentAction.set('reject');
    this.decisionComment = '';
  }

  cancelAction(): void {
    this.activeActionId.set(null);
    this.currentAction.set('null' as any);
    this.decisionComment = '';
  }

  confirmApprove(id: string): void {
    this.processingId.set(id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.leaveRequestService.approve(id, this.decisionComment.trim() || undefined).subscribe({
      next: () => {
        this.processingId.set(null);
        this.cancelAction();
        this.successMessage.set('Leave request approved successfully.');
        this.loadPending();
      },
      error: (err) => {
        this.processingId.set(null);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'Failed to approve leave request.'
        );
      },
    });
  }

  confirmReject(id: string): void {
    if (!this.decisionComment.trim()) {
      this.errorMessage.set('A comment is required when rejecting a leave request.');
      return;
    }

    this.processingId.set(id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.leaveRequestService.reject(id, this.decisionComment.trim()).subscribe({
      next: () => {
        this.processingId.set(null);
        this.cancelAction();
        this.successMessage.set('Leave request rejected.');
        this.loadPending();
      },
      error: (err) => {
        this.processingId.set(null);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'Failed to reject leave request.'
        );
      },
    });
  }

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
}
