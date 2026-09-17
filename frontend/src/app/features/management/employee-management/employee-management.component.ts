import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  EmployeeAdminService,
  EmployeeResponse,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmploymentStatus,
} from '../../../core/services/employee-admin.service';
import {
  OrganizationService,
  DepartmentResponse,
  PositionResponse,
} from '../../../core/services/organization.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  EmployeeCsvService,
  ImportResult,
} from './csv/employee-csv.service';
import { EmployeeImportDialogComponent } from './employee-import-dialog.component';

@Component({
  selector: 'app-employee-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EmployeeImportDialogComponent],
  template: `
    <div class="min-h-screen bg-slate-50">
      <!-- Header -->
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-950 text-sm font-bold text-white">
              HR
            </div>
            <div>
              <h1 class="text-sm font-semibold text-slate-900">Workforce & Employees</h1>
              <p class="text-xs text-slate-500">Employee Directory & Contract Management</p>
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
              class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900"
            >
              Employees
            </a>
            <a
              routerLink="/management/organization"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
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

      <main class="mx-auto max-w-7xl px-6 py-8">
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

        <!-- Metric Stat Cards -->
        <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-medium uppercase text-slate-500">Total Workforce</p>
            <p class="mt-1 text-2xl font-bold text-slate-900">{{ employees().length }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-medium uppercase text-emerald-600">Active Contracts</p>
            <p class="mt-1 text-2xl font-bold text-emerald-600">{{ activeEmployeesCount() }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-medium uppercase text-slate-500">Departments Active</p>
            <p class="mt-1 text-2xl font-bold text-indigo-950">{{ departments().length }}</p>
          </div>
        </div>

        <!-- Directory Section -->
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <!-- Search, Filters and Add Button -->
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6">
            <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div class="relative w-full max-w-xs">
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  placeholder="Search by name, email, or #…"
                  class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                />
              </div>

              <div class="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/75 p-1 text-xs">
                <button
                  type="button"
                  (click)="selectedStatusFilter.set('ALL')"
                  [ngClass]="selectedStatusFilter() === 'ALL' ? 'bg-white font-semibold text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                  class="rounded-md px-2.5 py-1 transition"
                >
                  All ({{ employees().length }})
                </button>
                <button
                  type="button"
                  (click)="selectedStatusFilter.set('ACTIVE')"
                  [ngClass]="selectedStatusFilter() === 'ACTIVE' ? 'bg-white font-semibold text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                  class="rounded-md px-2.5 py-1 transition"
                >
                  Active ({{ activeEmployeesCount() }})
                </button>
                <button
                  type="button"
                  (click)="selectedStatusFilter.set('SUSPENDED')"
                  [ngClass]="selectedStatusFilter() === 'SUSPENDED' ? 'bg-white font-semibold text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                  class="rounded-md px-2.5 py-1 transition"
                >
                  Suspended
                </button>
                <button
                  type="button"
                  (click)="selectedStatusFilter.set('TERMINATED')"
                  [ngClass]="selectedStatusFilter() === 'TERMINATED' ? 'bg-white font-semibold text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
                  class="rounded-md px-2.5 py-1 transition"
                >
                  Terminated
                </button>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="loadEmployees()"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Refresh
              </button>
              <button
                type="button"
                (click)="exportCsv()"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Export CSV
              </button>
              <button
                type="button"
                (click)="showImportDialog.set(true)"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Import CSV
              </button>
              <button
                type="button"
                (click)="openAddEmployee()"
                class="inline-flex items-center justify-center rounded-lg bg-indigo-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900"
              >
                + Add Employee
              </button>
            </div>
          </div>

          @if (loading()) {
            <div class="py-16 text-center text-sm text-slate-400">Loading workforce directory…</div>
          } @else if (filteredEmployees().length === 0) {
            <div class="rounded-xl border border-dashed border-slate-200 py-16 text-center">
              <p class="text-sm font-medium text-slate-600">No employees found</p>
              <p class="mt-1 text-xs text-slate-400">Try adjusting your search criteria or register a new employee.</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-slate-200 bg-slate-50/75 text-xs uppercase text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Employee</th>
                    <th class="px-4 py-3">Department & Position</th>
                    <th class="px-4 py-3">Status</th>
                    <th class="px-4 py-3">Hire Date</th>
                    <th class="px-4 py-3">Manager</th>
                    <th class="px-4 py-3">Contact</th>
                    <th class="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (emp of filteredEmployees(); track emp.id) {
                    <tr class="hover:bg-slate-50/50 transition">
                      <!-- Employee Name & Number -->
                      <td class="px-4 py-3.5">
                        <div class="flex items-center gap-3">
                          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                            {{ getInitials(emp) }}
                          </div>
                          <div>
                            <p class="font-semibold text-slate-900">{{ getFullName(emp) }}</p>
                            <p class="font-mono text-xs text-slate-400">{{ emp.employeeNumber }}</p>
                          </div>
                        </div>
                      </td>

                      <!-- Department & Position -->
                      <td class="px-4 py-3.5">
                        <div class="space-y-1">
                          <span class="inline-block rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-900">
                            {{ emp.currentAssignment?.departmentLabel || 'Unassigned' }}
                          </span>
                          <p class="text-xs text-slate-600 font-medium">
                            {{ emp.currentAssignment?.positionLabel || 'No Title' }}
                          </p>
                        </div>
                      </td>

                      <!-- Contract / Employment Status -->
                      <td class="px-4 py-3.5">
                        <span
                          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          [ngClass]="{
                            'bg-emerald-100 text-emerald-800': emp.employmentStatus === 'ACTIVE',
                            'bg-amber-100 text-amber-800': emp.employmentStatus === 'SUSPENDED',
                            'bg-rose-100 text-rose-800': emp.employmentStatus === 'TERMINATED'
                          }"
                        >
                          {{ emp.employmentStatus }}
                        </span>
                      </td>

                      <!-- Hire Date -->
                      <td class="px-4 py-3.5 text-xs text-slate-600">
                        {{ emp.profile?.hireDate || '—' }}
                      </td>

                      <!-- Reporting Manager -->
                      <td class="px-4 py-3.5 text-xs text-slate-700">
                        {{ emp.currentManager?.name || '—' }}
                      </td>

                      <!-- Contact Details -->
                      <td class="px-4 py-3.5">
                        <p class="text-xs text-slate-700">{{ emp.profile?.email }}</p>
                        @if (emp.profile?.phone) {
                          <p class="text-xs text-slate-400">{{ emp.profile?.phone }}</p>
                        }
                      </td>

                      <!-- Actions -->
                      <td class="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          (click)="openEditEmployee(emp)"
                          class="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Edit / Transfer
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <!-- MODAL: ADD EMPLOYEE -->
        @if (showAddModal()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
            <div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl my-8">
              <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 class="text-base font-semibold text-slate-900">Add New Employee</h3>
                  <p class="text-xs text-slate-500">Create employee profile and initial job assignment</p>
                </div>
                <button type="button" (click)="showAddModal.set(false)" class="text-slate-400 hover:text-slate-600">&times;</button>
              </div>

              <form (ngSubmit)="saveNewEmployee()" class="space-y-4 pt-4">
                <!-- Row 1: Identification -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Employee # *</label>
                    <input
                      type="text"
                      [(ngModel)]="newEmp.employeeNumber"
                      name="employeeNumber"
                      required
                      placeholder="e.g. EMP-020"
                      class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">First Name *</label>
                    <input
                      type="text"
                      [(ngModel)]="newEmp.firstName"
                      name="firstName"
                      required
                      placeholder="First name"
                      class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Last Name *</label>
                    <input
                      type="text"
                      [(ngModel)]="newEmp.lastName"
                      name="lastName"
                      required
                      placeholder="Last name"
                      class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                    />
                  </div>
                </div>

                <!-- Row 2: Contact -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Email Address *</label>
                    <input
                      type="email"
                      [(ngModel)]="newEmp.email"
                      name="email"
                      required
                      placeholder="employee@company.com"
                      class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Phone</label>
                    <input
                      type="tel"
                      [(ngModel)]="newEmp.phone"
                      name="phone"
                      placeholder="+216 55 123 456"
                      class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                    />
                  </div>
                </div>

                <!-- Row 3: Personal & Dates -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Gender</label>
                    <select
                      [(ngModel)]="newEmp.gender"
                      name="gender"
                      class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none bg-white"
                    >
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Birth Date</label>
                    <input
                      type="date"
                      [(ngModel)]="newEmp.birthDate"
                      name="birthDate"
                      class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Hire Date</label>
                    <input
                      type="date"
                      [(ngModel)]="newEmp.hireDate"
                      name="hireDate"
                      class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                    />
                  </div>
                </div>

                <!-- Section: Initial Job Assignment -->
                <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700">Initial Job Assignment</h4>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="mb-1 block text-xs font-medium text-slate-700">Department *</label>
                      <select
                        [(ngModel)]="newEmpDeptId"
                        name="deptId"
                        (change)="onDepartmentChange()"
                        required
                        class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none bg-white"
                      >
                        <option value="" disabled>Select Department</option>
                        @for (dept of departments(); track dept.id) {
                          <option [value]="dept.id">{{ dept.label }}</option>
                        }
                      </select>
                    </div>

                    <div>
                      <label class="mb-1 block text-xs font-medium text-slate-700">Position *</label>
                      <select
                        [(ngModel)]="newEmpPosId"
                        name="posId"
                        required
                        class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none bg-white"
                      >
                        <option value="" disabled>Select Position</option>
                        @for (pos of availablePositionsForDept(); track pos.id) {
                          <option [value]="pos.id">{{ pos.title }}</option>
                        }
                      </select>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="mb-1 block text-xs font-medium text-slate-700">Assignment Start Date *</label>
                      <input
                        type="date"
                        [(ngModel)]="newEmpAssignmentStartDate"
                        name="assignmentStart"
                        required
                        class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label class="mb-1 block text-xs font-medium text-slate-700">Reporting Manager</label>
                      <select
                        [(ngModel)]="newEmpManagerId"
                        name="managerEmployeeId"
                        class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none bg-white"
                      >
                        <option value="">None (Top-level / Self)</option>
                        @for (m of employees(); track m.id) {
                          <option [value]="m.id">{{ getFullName(m) }} ({{ m.employeeNumber }})</option>
                        }
                      </select>
                    </div>
                  </div>
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    (click)="showAddModal.set(false)"
                    class="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    [disabled]="saving() || !isNewEmployeeValid()"
                    class="rounded-lg bg-indigo-950 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900 disabled:opacity-50"
                  >
                    {{ saving() ? 'Creating…' : 'Create Employee' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- MODAL: EDIT / TRANSFER EMPLOYEE -->
        @if (showEditModal()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
            <div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl my-8">
              <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 class="text-base font-semibold text-slate-900">
                    Edit Employee & Contract: {{ editingEmployeeName() }}
                  </h3>
                  <p class="text-xs text-slate-500">Update status, contact details, or trigger job transfer</p>
                </div>
                <button type="button" (click)="showEditModal.set(false)" class="text-slate-400 hover:text-slate-600">&times;</button>
              </div>

              <form (ngSubmit)="saveEditedEmployee()" class="space-y-4 pt-4">
                <!-- Status & Tenure -->
                <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700">Contract & Status</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label class="mb-1 block text-xs font-medium text-slate-700">Employment Status</label>
                      <select
                        [(ngModel)]="editEmp.employmentStatus"
                        name="editStatus"
                        class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none bg-white"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="TERMINATED">TERMINATED</option>
                      </select>
                    </div>
                    <div>
                      <label class="mb-1 block text-xs font-medium text-slate-700">Hire Date</label>
                      <input
                        type="date"
                        [(ngModel)]="editEmp.hireDate"
                        name="editHireDate"
                        class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label class="mb-1 block text-xs font-medium text-slate-700">Departure Date</label>
                      <input
                        type="date"
                        [(ngModel)]="editEmp.departureDate"
                        name="editDepartureDate"
                        class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <!-- Profile Info -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">First Name</label>
                    <input
                      type="text"
                      [(ngModel)]="editEmp.firstName"
                      name="editFirstName"
                      class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Last Name</label>
                    <input
                      type="text"
                      [(ngModel)]="editEmp.lastName"
                      name="editLastName"
                      class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Email</label>
                    <input
                      type="email"
                      [(ngModel)]="editEmp.email"
                      name="editEmail"
                      class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Phone</label>
                    <input
                      type="tel"
                      [(ngModel)]="editEmp.phone"
                      name="editPhone"
                      class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                    />
                  </div>
                </div>

                <!-- Reporting Manager -->
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700">Reporting Manager</label>
                  <select
                    [(ngModel)]="editEmp.managerEmployeeId"
                    name="editManagerId"
                    class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none bg-white"
                  >
                    <option value="">Leave unchanged or unassigned</option>
                    @for (m of employees(); track m.id) {
                      @if (m.id !== editingEmployeeId()) {
                        <option [value]="m.id">{{ getFullName(m) }} ({{ m.employeeNumber }})</option>
                      }
                    }
                  </select>
                </div>

                <!-- Internal Job Transfer Option -->
                <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700">Job Assignment & Transfer</h4>
                      <p class="text-xs text-slate-500">
                        Current: {{ currentAssignmentLabel() }}
                      </p>
                    </div>
                    <label class="inline-flex items-center gap-2 text-xs font-medium text-indigo-950 cursor-pointer">
                      <input type="checkbox" [(ngModel)]="enableTransfer" name="transferToggle" class="rounded border-slate-300" />
                      Assign New Position / Department
                    </label>
                  </div>

                  @if (enableTransfer) {
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <label class="mb-1 block text-xs font-medium text-slate-700">New Department</label>
                        <select
                          [(ngModel)]="transferDeptId"
                          name="transferDept"
                          (change)="onTransferDepartmentChange()"
                          class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none bg-white"
                        >
                          <option value="" disabled>Select Department</option>
                          @for (dept of departments(); track dept.id) {
                            <option [value]="dept.id">{{ dept.label }}</option>
                          }
                        </select>
                      </div>
                      <div>
                        <label class="mb-1 block text-xs font-medium text-slate-700">New Position</label>
                        <select
                          [(ngModel)]="transferPosId"
                          name="transferPos"
                          class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none bg-white"
                        >
                          <option value="" disabled>Select Position</option>
                          @for (pos of availablePositionsForTransfer(); track pos.id) {
                            <option [value]="pos.id">{{ pos.title }}</option>
                          }
                        </select>
                      </div>
                      <div>
                        <label class="mb-1 block text-xs font-medium text-slate-700">Transfer Effective Date</label>
                        <input
                          type="date"
                          [(ngModel)]="transferStartDate"
                          name="transferDate"
                          class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs shadow-sm focus:border-indigo-950 focus:outline-none"
                        />
                      </div>
                    </div>
                  }
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    (click)="showEditModal.set(false)"
                    class="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    [disabled]="saving()"
                    class="rounded-lg bg-indigo-950 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900 disabled:opacity-50"
                  >
                    {{ saving() ? 'Saving…' : 'Save Changes' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- CSV IMPORT DIALOG -->
        @if (showImportDialog()) {
          <app-employee-import-dialog
            [existingEmployees]="employees()"
            [departments]="departments()"
            [positions]="positions()"
            (close)="showImportDialog.set(false)"
            (imported)="onImportCompleted($event)"
          />
        }
      </main>
    </div>
  `,
})
export class EmployeeManagementComponent implements OnInit {
  private readonly empService = inject(EmployeeAdminService);
  private readonly orgService = inject(OrganizationService);
  private readonly csvService = inject(EmployeeCsvService);
  readonly auth = inject(AuthService);

  readonly showImportDialog = signal(false);
  readonly employees = signal<EmployeeResponse[]>([]);
  readonly departments = signal<DepartmentResponse[]>([]);
  readonly positions = signal<PositionResponse[]>([]);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filters
  searchQuery = '';
  readonly selectedStatusFilter = signal<'ALL' | EmploymentStatus>('ALL');

  // Stats
  readonly activeEmployeesCount = computed(() => {
    return this.employees().filter((e) => e.employmentStatus === 'ACTIVE').length;
  });

  readonly filteredEmployees = computed(() => {
    const list = this.employees();
    const query = this.searchQuery.toLowerCase().trim();
    const status = this.selectedStatusFilter();

    return list.filter((emp) => {
      // Status filter
      if (status !== 'ALL' && emp.employmentStatus !== status) {
        return false;
      }
      // Search query
      if (query) {
        const name = this.getFullName(emp).toLowerCase();
        const num = (emp.employeeNumber || '').toLowerCase();
        const email = (emp.profile?.email || '').toLowerCase();
        const dept = (emp.currentAssignment?.departmentLabel || '').toLowerCase();
        const pos = (emp.currentAssignment?.positionLabel || '').toLowerCase();
        return (
          name.includes(query) ||
          num.includes(query) ||
          email.includes(query) ||
          dept.includes(query) ||
          pos.includes(query)
        );
      }
      return true;
    });
  });

  // Add Employee State
  readonly showAddModal = signal(false);
  newEmp = {
    employeeNumber: '',
    firstName: '',
    lastName: '',
    gender: '',
    birthDate: '',
    email: '',
    phone: '',
    hireDate: new Date().toISOString().substring(0, 10),
  };
  newEmpDeptId = '';
  newEmpPosId = '';
  newEmpAssignmentStartDate = new Date().toISOString().substring(0, 10);
  newEmpManagerId = '';

  // Edit Employee State
  readonly showEditModal = signal(false);
  readonly editingEmployeeId = signal<string | null>(null);
  readonly editingEmployeeName = signal('');
  readonly currentAssignmentLabel = signal('');
  editEmp: UpdateEmployeeRequest = {};
  enableTransfer = false;
  transferDeptId = '';
  transferPosId = '';
  transferStartDate = new Date().toISOString().substring(0, 10);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.empService.listEmployees().subscribe({
      next: (res) => {
        this.employees.set(res.data || []);
        this.orgService.listDepartments().subscribe({
          next: (deptRes) => {
            this.departments.set(deptRes.data || []);
            this.orgService.listPositions().subscribe({
              next: (posRes) => {
                this.positions.set(posRes.data || []);
                this.loading.set(false);
              },
              error: () => this.loading.set(false),
            });
          },
          error: () => this.loading.set(false),
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to load employees.');
      },
    });
  }

  loadEmployees(): void {
    this.loading.set(true);
    this.empService.listEmployees().subscribe({
      next: (res) => {
        this.employees.set(res.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to load employees.');
      },
    });
  }

  getFullName(emp: EmployeeResponse): string {
    if (!emp.profile) return emp.employeeNumber;
    return `${emp.profile.firstName || ''} ${emp.profile.lastName || ''}`.trim() || emp.employeeNumber;
  }

  getInitials(emp: EmployeeResponse): string {
    const fn = emp.profile?.firstName?.charAt(0) || '';
    const ln = emp.profile?.lastName?.charAt(0) || '';
    return (fn + ln).toUpperCase() || 'EM';
  }

  availablePositionsForDept(): PositionResponse[] {
    if (!this.newEmpDeptId) return this.positions();
    return this.positions().filter((p) => p.departmentId === this.newEmpDeptId);
  }

  availablePositionsForTransfer(): PositionResponse[] {
    if (!this.transferDeptId) return this.positions();
    return this.positions().filter((p) => p.departmentId === this.transferDeptId);
  }

  onDepartmentChange(): void {
    const validPositions = this.availablePositionsForDept();
    this.newEmpPosId = validPositions[0]?.id || '';
  }

  onTransferDepartmentChange(): void {
    const validPositions = this.availablePositionsForTransfer();
    this.transferPosId = validPositions[0]?.id || '';
  }

  openAddEmployee(): void {
    const defaultDept = this.departments()[0]?.id || '';
    this.newEmpDeptId = defaultDept;
    this.newEmpPosId = this.positions().find((p) => p.departmentId === defaultDept)?.id || this.positions()[0]?.id || '';
    this.newEmpAssignmentStartDate = new Date().toISOString().substring(0, 10);
    this.newEmpManagerId = '';
    this.newEmp = {
      employeeNumber: '',
      firstName: '',
      lastName: '',
      gender: '',
      birthDate: '',
      email: '',
      phone: '',
      hireDate: new Date().toISOString().substring(0, 10),
    };
    this.showAddModal.set(true);
  }

  isNewEmployeeValid(): boolean {
    return (
      !!this.newEmp.employeeNumber.trim() &&
      !!this.newEmp.firstName.trim() &&
      !!this.newEmp.lastName.trim() &&
      !!this.newEmp.email.trim() &&
      !!this.newEmpDeptId &&
      !!this.newEmpPosId
    );
  }

  saveNewEmployee(): void {
    if (!this.isNewEmployeeValid()) return;

    const selectedDept = this.departments().find((d) => d.id === this.newEmpDeptId);
    const selectedPos = this.positions().find((p) => p.id === this.newEmpPosId);

    const req: CreateEmployeeRequest = {
      employeeNumber: this.newEmp.employeeNumber.trim(),
      employmentStatus: 'ACTIVE',
      firstName: this.newEmp.firstName.trim(),
      lastName: this.newEmp.lastName.trim(),
      email: this.newEmp.email.trim(),
      phone: this.newEmp.phone.trim() || undefined,
      gender: this.newEmp.gender || undefined,
      birthDate: this.newEmp.birthDate || undefined,
      hireDate: this.newEmp.hireDate || undefined,
      initialAssignment: {
        departmentId: this.newEmpDeptId,
        departmentLabel: selectedDept?.label || 'General',
        positionId: this.newEmpPosId,
        positionLabel: selectedPos?.title || 'Employee',
        startDate: this.newEmpAssignmentStartDate,
      },
      managerEmployeeId: this.newEmpManagerId || undefined,
    };

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.empService.createEmployee(req).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.showAddModal.set(false);
        this.successMessage.set(`Employee ${this.getFullName(created)} (${created.employeeNumber}) created successfully.`);
        this.loadEmployees();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to create employee.');
      },
    });
  }

  openEditEmployee(emp: EmployeeResponse): void {
    this.editingEmployeeId.set(emp.id);
    this.editingEmployeeName.set(this.getFullName(emp));
    const currAssignment = emp.currentAssignment;
    this.currentAssignmentLabel.set(
      currAssignment
        ? `${currAssignment.departmentLabel} — ${currAssignment.positionLabel}`
        : 'None'
    );

    this.editEmp = {
      employmentStatus: emp.employmentStatus,
      firstName: emp.profile?.firstName,
      lastName: emp.profile?.lastName,
      email: emp.profile?.email,
      phone: emp.profile?.phone,
      hireDate: emp.profile?.hireDate,
      departureDate: emp.profile?.departureDate,
      managerEmployeeId: emp.currentManager?.employeeId || '',
    };

    this.enableTransfer = false;
    this.transferDeptId = currAssignment?.departmentId || this.departments()[0]?.id || '';
    this.transferPosId = currAssignment?.positionId || this.positions()[0]?.id || '';
    this.transferStartDate = new Date().toISOString().substring(0, 10);

    this.showEditModal.set(true);
  }

  saveEditedEmployee(): void {
    const id = this.editingEmployeeId();
    if (!id) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload: UpdateEmployeeRequest = {
      employmentStatus: this.editEmp.employmentStatus,
      firstName: this.editEmp.firstName?.trim(),
      lastName: this.editEmp.lastName?.trim(),
      email: this.editEmp.email?.trim(),
      phone: this.editEmp.phone?.trim() || undefined,
      hireDate: this.editEmp.hireDate || undefined,
      departureDate: this.editEmp.departureDate || undefined,
      managerEmployeeId: this.editEmp.managerEmployeeId || undefined,
    };

    if (this.enableTransfer && this.transferDeptId && this.transferPosId) {
      const dept = this.departments().find((d) => d.id === this.transferDeptId);
      const pos = this.positions().find((p) => p.id === this.transferPosId);
      payload.newAssignment = {
        departmentId: this.transferDeptId,
        departmentLabel: dept?.label || 'General',
        positionId: this.transferPosId,
        positionLabel: pos?.title || 'Employee',
        startDate: this.transferStartDate,
      };
    }

    this.empService.updateEmployee(id, payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.showEditModal.set(false);
        this.successMessage.set(`Employee ${this.getFullName(updated)} updated successfully.`);
        this.loadEmployees();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to update employee.');
      },
    });
  }

  exportCsv(): void {
    const listToExport = this.filteredEmployees();
    const csv = this.csvService.exportEmployeesCsv(listToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees-export-${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  onImportCompleted(result: ImportResult): void {
    const errorMsg = result.failedCount > 0 ? ` (${result.failedCount} failed)` : '';
    const skippedMsg = result.skippedCount > 0 ? ` ${result.skippedCount} skipped.` : '';
    this.successMessage.set(
      `Import processed: ${result.importedCount} employees added successfully.${skippedMsg}${errorMsg}`
    );
    this.loadEmployees();
  }
}
