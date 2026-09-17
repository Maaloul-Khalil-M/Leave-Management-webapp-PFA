import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  OrganizationService,
  DepartmentResponse,
  PositionResponse,
} from '../../../core/services/organization.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-organization-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-50">
      <!-- Header -->
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-950 text-sm font-bold text-white">
              HR
            </div>
            <div>
              <h1 class="text-sm font-semibold text-slate-900">Organization Master Data</h1>
              <p class="text-xs text-slate-500">Departments & Job Positions</p>
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
              routerLink="/management/employees"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              Employees
            </a>
            <a
              routerLink="/management/organization"
              class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900"
            >
              Organization
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

        <!-- Tab Controls -->
        <div class="mb-6 flex border-b border-slate-200">
          <button
            type="button"
            (click)="activeTab.set('departments')"
            [ngClass]="activeTab() === 'departments' ? 'border-indigo-950 text-indigo-950 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'"
            class="border-b-2 px-6 py-3 text-sm transition"
          >
            Departments ({{ departments().length }})
          </button>
          <button
            type="button"
            (click)="activeTab.set('positions')"
            [ngClass]="activeTab() === 'positions' ? 'border-indigo-950 text-indigo-950 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'"
            class="border-b-2 px-6 py-3 text-sm transition"
          >
            Job Positions ({{ positions().length }})
          </button>
        </div>

        <!-- DEPARTMENTS TAB -->
        @if (activeTab() === 'departments') {
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
              <div>
                <h2 class="text-base font-semibold text-slate-900">Departments</h2>
                <p class="text-xs text-slate-500">Corporate units and organizational branches</p>
              </div>
              <button
                type="button"
                (click)="openAddDepartment()"
                class="inline-flex items-center justify-center rounded-lg bg-indigo-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900"
              >
                + Add Department
              </button>
            </div>

            @if (loading()) {
              <div class="py-12 text-center text-sm text-slate-400">Loading departments…</div>
            } @else if (departments().length === 0) {
              <div class="rounded-xl border border-dashed border-slate-200 py-12 text-center">
                <p class="text-sm font-medium text-slate-600">No departments found</p>
                <p class="mt-1 text-xs text-slate-400">Add the first department to organize your workforce.</p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="border-b border-slate-200 bg-slate-50/75 text-xs uppercase text-slate-500">
                    <tr>
                      <th class="px-4 py-3">Label</th>
                      <th class="px-4 py-3">ID</th>
                      <th class="px-4 py-3 text-right">Associated Positions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (dept of departments(); track dept.id) {
                      <tr class="hover:bg-slate-50/50 transition">
                        <td class="px-4 py-3.5 font-medium text-slate-900">{{ dept.label }}</td>
                        <td class="px-4 py-3.5 font-mono text-xs text-slate-400">{{ dept.id }}</td>
                        <td class="px-4 py-3.5 text-right font-medium text-slate-600">
                          {{ getPositionsForDepartment(dept.id).length }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        }

        <!-- POSITIONS TAB -->
        @if (activeTab() === 'positions') {
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
              <div>
                <h2 class="text-base font-semibold text-slate-900">Job Positions</h2>
                <p class="text-xs text-slate-500">Titles, job descriptions, and departmental assignments</p>
              </div>
              <button
                type="button"
                (click)="openAddPosition()"
                class="inline-flex items-center justify-center rounded-lg bg-indigo-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900"
              >
                + Add Position
              </button>
            </div>

            @if (loading()) {
              <div class="py-12 text-center text-sm text-slate-400">Loading positions…</div>
            } @else if (positions().length === 0) {
              <div class="rounded-xl border border-dashed border-slate-200 py-12 text-center">
                <p class="text-sm font-medium text-slate-600">No positions found</p>
                <p class="mt-1 text-xs text-slate-400">Add job titles to define employee assignments.</p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="border-b border-slate-200 bg-slate-50/75 text-xs uppercase text-slate-500">
                    <tr>
                      <th class="px-4 py-3">Title</th>
                      <th class="px-4 py-3">Department</th>
                      <th class="px-4 py-3">ID</th>
                      <th class="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (pos of positions(); track pos.id) {
                      <tr class="hover:bg-slate-50/50 transition">
                        <td class="px-4 py-3.5 font-medium text-slate-900">{{ pos.title }}</td>
                        <td class="px-4 py-3.5">
                          <span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {{ getDepartmentLabel(pos.departmentId) }}
                          </span>
                        </td>
                        <td class="px-4 py-3.5 font-mono text-xs text-slate-400">{{ pos.id }}</td>
                        <td class="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            (click)="openEditPosition(pos)"
                            class="rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        }

        <!-- MODAL: ADD DEPARTMENT -->
        @if (showAddDeptModal()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div class="flex items-center justify-between pb-3">
                <h3 class="text-base font-semibold text-slate-900">Add Department</h3>
                <button type="button" (click)="showAddDeptModal.set(false)" class="text-slate-400 hover:text-slate-600">&times;</button>
              </div>
              <form (ngSubmit)="saveDepartment()" class="space-y-4">
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700">Department Name</label>
                  <input
                    type="text"
                    [(ngModel)]="newDeptLabel"
                    name="label"
                    required
                    placeholder="e.g. Engineering, Human Resources, Finance"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-950 focus:outline-none"
                  />
                </div>
                <div class="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    (click)="showAddDeptModal.set(false)"
                    class="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    [disabled]="saving() || !newDeptLabel.trim()"
                    class="rounded-lg bg-indigo-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900 disabled:opacity-50"
                  >
                    {{ saving() ? 'Saving…' : 'Save Department' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- MODAL: ADD / EDIT POSITION -->
        @if (showPositionModal()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div class="flex items-center justify-between pb-3">
                <h3 class="text-base font-semibold text-slate-900">
                  {{ editingPositionId() ? 'Edit Position' : 'Add Position' }}
                </h3>
                <button type="button" (click)="showPositionModal.set(false)" class="text-slate-400 hover:text-slate-600">&times;</button>
              </div>
              <form (ngSubmit)="savePosition()" class="space-y-4">
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700">Position Title</label>
                  <input
                    type="text"
                    [(ngModel)]="positionTitle"
                    name="title"
                    required
                    placeholder="e.g. Senior Software Engineer, HR Specialist"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-950 focus:outline-none"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700">Department</label>
                  <select
                    [(ngModel)]="positionDepartmentId"
                    name="departmentId"
                    required
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-950 focus:outline-none bg-white"
                  >
                    <option value="" disabled>Select a department</option>
                    @for (dept of departments(); track dept.id) {
                      <option [value]="dept.id">{{ dept.label }}</option>
                    }
                  </select>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    (click)="showPositionModal.set(false)"
                    class="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    [disabled]="saving() || !positionTitle.trim() || !positionDepartmentId"
                    class="rounded-lg bg-indigo-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900 disabled:opacity-50"
                  >
                    {{ saving() ? 'Saving…' : (editingPositionId() ? 'Update Position' : 'Save Position') }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class OrganizationManagementComponent implements OnInit {
  private readonly orgService = inject(OrganizationService);
  readonly auth = inject(AuthService);

  readonly departments = signal<DepartmentResponse[]>([]);
  readonly positions = signal<PositionResponse[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly activeTab = signal<'departments' | 'positions'>('departments');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Department Modal
  readonly showAddDeptModal = signal(false);
  newDeptLabel = '';

  // Position Modal
  readonly showPositionModal = signal(false);
  readonly editingPositionId = signal<string | null>(null);
  positionTitle = '';
  positionDepartmentId = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.orgService.listDepartments().subscribe({
      next: (deptRes) => {
        this.departments.set(deptRes.data || []);
        this.orgService.listPositions().subscribe({
          next: (posRes) => {
            this.positions.set(posRes.data || []);
            this.loading.set(false);
          },
          error: (err) => {
            this.loading.set(false);
            this.errorMessage.set(err?.error?.message || 'Failed to load positions.');
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to load departments.');
      },
    });
  }

  getDepartmentLabel(deptId?: string): string {
    if (!deptId) return '—';
    const dept = this.departments().find((d) => d.id === deptId);
    return dept ? dept.label : deptId;
  }

  getPositionsForDepartment(deptId: string): PositionResponse[] {
    return this.positions().filter((p) => p.departmentId === deptId);
  }

  // Departments Actions
  openAddDepartment(): void {
    this.newDeptLabel = '';
    this.showAddDeptModal.set(true);
  }

  saveDepartment(): void {
    if (!this.newDeptLabel.trim()) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.orgService.createDepartment({ label: this.newDeptLabel.trim() }).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.showAddDeptModal.set(false);
        this.successMessage.set(`Department "${created.label}" created successfully.`);
        this.loadData();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to create department.');
      },
    });
  }

  // Positions Actions
  openAddPosition(): void {
    this.editingPositionId.set(null);
    this.positionTitle = '';
    this.positionDepartmentId = this.departments()[0]?.id || '';
    this.showPositionModal.set(true);
  }

  openEditPosition(pos: PositionResponse): void {
    this.editingPositionId.set(pos.id);
    this.positionTitle = pos.title;
    this.positionDepartmentId = pos.departmentId || '';
    this.showPositionModal.set(true);
  }

  savePosition(): void {
    if (!this.positionTitle.trim() || !this.positionDepartmentId) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const posId = this.editingPositionId();
    if (posId) {
      this.orgService
        .updatePosition(posId, {
          title: this.positionTitle.trim(),
          departmentId: this.positionDepartmentId,
        })
        .subscribe({
          next: (updated) => {
            this.saving.set(false);
            this.showPositionModal.set(false);
            this.successMessage.set(`Position "${updated.title}" updated successfully.`);
            this.loadData();
          },
          error: (err) => {
            this.saving.set(false);
            this.errorMessage.set(err?.error?.message || 'Failed to update position.');
          },
        });
    } else {
      this.orgService
        .createPosition({
          title: this.positionTitle.trim(),
          departmentId: this.positionDepartmentId,
        })
        .subscribe({
          next: (created) => {
            this.saving.set(false);
            this.showPositionModal.set(false);
            this.successMessage.set(`Position "${created.title}" created successfully.`);
            this.loadData();
          },
          error: (err) => {
            this.saving.set(false);
            this.errorMessage.set(err?.error?.message || 'Failed to create position.');
          },
        });
    }
  }
}
