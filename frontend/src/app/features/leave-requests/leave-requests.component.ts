import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LeaveRequestService,
  CreateLeaveRequest,
  LeaveRequestResponse,
  LeaveTypeCode,
} from '../../core/services/leave-request.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-50">
      <!-- Header -->
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
              LR
            </div>
            <div>
              <h1 class="text-sm font-semibold text-slate-900">Leave Requests</h1>
              <p class="text-xs text-slate-500">Employee Self-Service</p>
            </div>
          </div>
          <nav class="flex items-center gap-2">
            <a
              routerLink="/"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Dashboard
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
        <div class="grid gap-8 lg:grid-cols-3">
          <!-- Draft Form -->
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 class="text-base font-semibold text-slate-900">Create Draft Request</h2>
            <p class="mt-1 text-xs text-slate-500">
              Drafts are not submitted for approval and do not deduct your leave balance.
            </p>

            @if (errorMessage()) {
              <div class="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                {{ errorMessage() }}
              </div>
            }

            @if (successMessage()) {
              <div class="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
                {{ successMessage() }}
              </div>
            }

            <form (ngSubmit)="submitDraft()" class="mt-4 space-y-4">
              <div>
                <label class="block text-xs font-medium text-slate-700">Leave Type</label>
                <select
                  [(ngModel)]="form.leaveTypeCode"
                  name="leaveTypeCode"
                  class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  required
                >
                  <option value="PAID_ANNUAL">Paid Annual</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                  <option value="MATERNITY">Maternity</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-700">Start Date</label>
                  <input
                    type="date"
                    [(ngModel)]="form.startDate"
                    name="startDate"
                    class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-700">End Date</label>
                  <input
                    type="date"
                    [(ngModel)]="form.endDate"
                    name="endDate"
                    class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div class="space-y-2 pt-1">
                <label class="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    [(ngModel)]="form.halfDayStart"
                    name="halfDayStart"
                    class="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  Half day on start date
                </label>
                <label class="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    [(ngModel)]="form.halfDayEnd"
                    name="halfDayEnd"
                    class="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  Half day on end date
                </label>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-700">Reason (Optional)</label>
                <textarea
                  [(ngModel)]="form.reason"
                  name="reason"
                  rows="3"
                  class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none"
                  placeholder="e.g. Personal travel, family event"
                ></textarea>
              </div>

              <button
                type="submit"
                [disabled]="submitting()"
                class="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {{ submitting() ? 'Saving Draft…' : 'Save as Draft' }}
              </button>
            </form>
          </section>

          <!-- Requests List -->
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div class="flex items-center justify-between pb-4">
              <div>
                <h2 class="text-base font-semibold text-slate-900">My Requests</h2>
                <p class="text-xs text-slate-500">History of drafts and submitted leaves</p>
              </div>
              <button
                type="button"
                (click)="loadRequests()"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            @if (loading()) {
              <div class="py-12 text-center text-sm text-slate-400">Loading requests…</div>
            } @else if (requests().length === 0) {
              <div class="rounded-xl border border-dashed border-slate-200 py-12 text-center">
                <p class="text-sm font-medium text-slate-600">No leave requests found</p>
                <p class="mt-1 text-xs text-slate-400">Create your first draft using the form on the left.</p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th class="pb-3">Type</th>
                      <th class="pb-3">Period</th>
                      <th class="pb-3">Duration</th>
                      <th class="pb-3">Status</th>
                      <th class="pb-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (req of requests(); track req.id) {
                      <tr>
                        <td class="py-3 font-medium text-slate-900">
                          {{ formatType(req.leaveTypeCode) }}
                        </td>
                        <td class="py-3 text-xs text-slate-600">
                          {{ req.startDate }} → {{ req.endDate }}
                          @if (req.halfDayStart || req.halfDayEnd) {
                            <span class="text-slate-400">
                              ({{ req.halfDayStart ? '½ start' : '' }}{{ req.halfDayStart && req.halfDayEnd ? ', ' : '' }}{{ req.halfDayEnd ? '½ end' : '' }})
                            </span>
                          }
                        </td>
                        <td class="py-3 text-xs font-medium text-slate-700">
                          {{ req.durationDays }} {{ req.durationDays === 1 ? 'day' : 'days' }}
                        </td>
                        <td class="py-3">
                          <span
                            class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            [ngClass]="{
                              'bg-amber-50 text-amber-700 ring-1 ring-amber-200': req.status === 'DRAFT',
                              'bg-blue-50 text-blue-700 ring-1 ring-blue-200': req.status === 'PENDING',
                              'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200': req.status === 'APPROVED',
                              'bg-rose-50 text-rose-700 ring-1 ring-rose-200': req.status === 'REJECTED',
                              'bg-slate-100 text-slate-600': req.status === 'CANCELLED'
                            }"
                          >
                            {{ req.status }}
                          </span>
                        </td>
                        <td class="max-w-xs truncate py-3 text-xs text-slate-500">
                          {{ req.reason || '—' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        </div>
      </main>
    </div>
  `,
})
export class LeaveRequestsComponent implements OnInit {
  private readonly leaveRequestService = inject(LeaveRequestService);
  readonly auth = inject(AuthService);

  readonly requests = signal<LeaveRequestResponse[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  form: CreateLeaveRequest = {
    leaveTypeCode: 'PAID_ANNUAL',
    startDate: '',
    endDate: '',
    halfDayStart: false,
    halfDayEnd: false,
    reason: '',
  };

  ngOnInit(): void {
    this.loadRequests();
  }

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

  submitDraft(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.form.startDate || !this.form.endDate) {
      this.errorMessage.set('Please select both a start date and an end date.');
      return;
    }

    if (this.form.endDate < this.form.startDate) {
      this.errorMessage.set('End date cannot be before start date.');
      return;
    }

    this.submitting.set(true);
    this.leaveRequestService.createDraft(this.form).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.successMessage.set(
          `Draft leave request created successfully (${created.durationDays} days).`
        );
        this.form = {
          leaveTypeCode: 'PAID_ANNUAL',
          startDate: '',
          endDate: '',
          halfDayStart: false,
          halfDayEnd: false,
          reason: '',
        };
        this.loadRequests();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'Failed to create draft request.'
        );
      },
    });
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
