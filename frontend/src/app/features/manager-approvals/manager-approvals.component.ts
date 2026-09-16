import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LeaveRequestService,
  LeaveRequestResponse,
  LeaveTypeCode,
} from '../../core/services/leave-request.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-manager-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-50">
      <!-- Header -->
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-950 text-sm font-bold text-white">
              AP
            </div>
            <div>
              <h1 class="text-sm font-semibold text-slate-900">Team Leave Approvals</h1>
              <p class="text-xs text-slate-500">Manager Queue</p>
            </div>
          </div>
          <nav class="flex items-center gap-3">
            <a
              routerLink="/dashboard"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Dashboard
            </a>
            <a
              routerLink="/leave-requests"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              My Requests
            </a>
            @if (auth.isLoggedIn()) {
              <button
                type="button"
                (click)="auth.logout()"
                class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Sign out
              </button>
            }
          </nav>
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-6 py-8">
        <!-- Notification Banners -->
        @if (errorMessage()) {
          <div class="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm">
            <div class="flex items-center justify-between">
              <span>{{ errorMessage() }}</span>
              <button type="button" (click)="errorMessage.set(null)" class="text-rose-500 hover:text-rose-700">&times;</button>
            </div>
          </div>
        }

        @if (successMessage()) {
          <div class="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
            <div class="flex items-center justify-between">
              <span>{{ successMessage() }}</span>
              <button type="button" (click)="successMessage.set(null)" class="text-emerald-500 hover:text-emerald-700">&times;</button>
            </div>
          </div>
        }

        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-center justify-between pb-4">
            <div>
              <h2 class="text-base font-semibold text-slate-900">Pending Requests Queue</h2>
              <p class="text-xs text-slate-500">
                Leave requests submitted by your direct reports requiring approval or rejection
              </p>
            </div>
            <button
              type="button"
              (click)="loadPending()"
              class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          @if (loading()) {
            <div class="py-12 text-center text-sm text-slate-400">Loading pending requests…</div>
          } @else if (pendingRequests().length === 0) {
            <div class="rounded-xl border border-dashed border-slate-200 py-12 text-center">
              <p class="text-sm font-medium text-slate-600">No pending leave requests</p>
              <p class="mt-1 text-xs text-slate-400">All caught up! There are no requests awaiting your approval.</p>
            </div>
          } @else {
            <div class="space-y-4">
              @for (req of pendingRequests(); track req.id) {
                <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:bg-slate-50">
                  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <!-- Employee & Leave Details -->
                    <div class="space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-slate-900">
                          {{ getEmployeeName(req) }}
                        </span>
                        @if (req.employeeSnapshot?.departmentLabel) {
                          <span class="rounded bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {{ req.employeeSnapshot?.departmentLabel }}
                          </span>
                        }
                      </div>

                      <div class="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span class="font-medium text-slate-800">{{ formatType(req.leaveTypeCode) }}</span>
                        <span>•</span>
                        <span>{{ req.startDate }} → {{ req.endDate }}</span>
                        @if (req.halfDayStart || req.halfDayEnd) {
                          <span class="text-slate-400">
                            ({{ req.halfDayStart ? '½ start' : '' }}{{ req.halfDayStart && req.halfDayEnd ? ', ' : '' }}{{ req.halfDayEnd ? '½ end' : '' }})
                          </span>
                        }
                        <span>•</span>
                        <span class="font-semibold text-slate-900">{{ req.durationDays }} {{ req.durationDays === 1 ? 'day' : 'days' }}</span>
                      </div>

                      @if (req.reason) {
                        <p class="text-xs text-slate-500 italic">"{{ req.reason }}"</p>
                      }
                    </div>

                    <!-- Action Controls -->
                    <div class="flex items-center gap-2">
                      @if (activeActionId() !== req.id) {
                        <button
                          type="button"
                          (click)="openApprove(req.id)"
                          [disabled]="processingId() === req.id"
                          class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          (click)="openReject(req.id)"
                          [disabled]="processingId() === req.id"
                          class="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Inline Decision Form -->
                  @if (activeActionId() === req.id) {
                    <div class="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                      <div class="mb-2 flex items-center justify-between">
                        <span class="text-xs font-semibold" [ngClass]="currentAction() === 'approve' ? 'text-emerald-700' : 'text-rose-700'">
                          {{ currentAction() === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request' }}
                        </span>
                        <button type="button" (click)="cancelAction()" class="text-xs text-slate-400 hover:text-slate-600">
                          Cancel
                        </button>
                      </div>

                      <div class="space-y-3">
                        <input
                          type="text"
                          [(ngModel)]="decisionComment"
                          [placeholder]="currentAction() === 'approve' ? 'Optional approval comment' : 'Reason for rejection (required)'"
                          class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-slate-900 focus:outline-none"
                        />

                        <div class="flex justify-end gap-2">
                          <button
                            type="button"
                            (click)="cancelAction()"
                            class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          @if (currentAction() === 'approve') {
                            <button
                              type="button"
                              (click)="confirmApprove(req.id)"
                              [disabled]="processingId() === req.id"
                              class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                            >
                              {{ processingId() === req.id ? 'Approving…' : 'Confirm Approval' }}
                            </button>
                          } @else {
                            <button
                              type="button"
                              (click)="confirmReject(req.id)"
                              [disabled]="processingId() === req.id || !decisionComment.trim()"
                              class="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-50"
                            >
                              {{ processingId() === req.id ? 'Rejecting…' : 'Confirm Rejection' }}
                            </button>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </section>
      </main>
    </div>
  `,
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
