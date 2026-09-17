import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  OrganizationService,
  DepartmentResponse,
  PositionResponse,
  OrganizationSettingsResponse,
  CountryCode,
} from '../../../core/services/organization.service';
import {
  CalendarAdminService,
  CalendarDto,
  CalendarDayDto,
  DayType,
} from '../../../core/services/calendar-admin.service';
import { AuthService } from '../../../core/auth/auth.service';

type ManagementTab = 'departments' | 'positions' | 'calendars' | 'settings';

interface DayOfWeekOption {
  value: number;
  label: string;
}

const DAYS_OF_WEEK: DayOfWeekOption[] = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

@Component({
  selector: 'app-organization-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
              <h1 class="text-sm font-semibold text-slate-900">Organization & Master Data</h1>
              <p class="text-xs text-slate-500">Departments, Positions, Calendars & Working Rules</p>
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

        <!-- Tab Navigation Bar -->
        <div class="mb-6 flex flex-wrap border-b border-slate-200 gap-1">
          <button
            type="button"
            (click)="setTab('departments')"
            [ngClass]="activeTab() === 'departments' ? 'border-indigo-950 text-indigo-950 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'"
            class="border-b-2 px-5 py-3 text-sm transition"
          >
            Departments ({{ departments().length }})
          </button>
          <button
            type="button"
            (click)="setTab('positions')"
            [ngClass]="activeTab() === 'positions' ? 'border-indigo-950 text-indigo-950 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'"
            class="border-b-2 px-5 py-3 text-sm transition"
          >
            Job Positions ({{ positions().length }})
          </button>
          <button
            type="button"
            (click)="setTab('calendars')"
            [ngClass]="activeTab() === 'calendars' ? 'border-indigo-950 text-indigo-950 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'"
            class="border-b-2 px-5 py-3 text-sm transition"
          >
            Work Calendars ({{ calendars().length }})
          </button>
          <button
            type="button"
            (click)="setTab('settings')"
            [ngClass]="activeTab() === 'settings' ? 'border-indigo-950 text-indigo-950 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'"
            class="border-b-2 px-5 py-3 text-sm transition"
          >
            Company Settings
          </button>
        </div>

        <!-- ========================================================= -->
        <!-- 1. DEPARTMENTS TAB                                        -->
        <!-- ========================================================= -->
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

        <!-- ========================================================= -->
        <!-- 2. POSITIONS TAB                                          -->
        <!-- ========================================================= -->
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

        <!-- ========================================================= -->
        <!-- 3. CALENDARS & HOLIDAYS TAB                               -->
        <!-- ========================================================= -->
        @if (activeTab() === 'calendars') {
          <div class="space-y-6">
            <!-- Calendars Master List -->
            <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
                <div>
                  <h2 class="text-base font-semibold text-slate-900">Work Calendars</h2>
                  <p class="text-xs text-slate-500">Jurisdiction-specific annual calendars and working schedules</p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="loadCalendars()"
                    class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    (click)="openAddCalendar()"
                    class="inline-flex items-center justify-center rounded-lg bg-indigo-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900"
                  >
                    + Add Calendar
                  </button>
                </div>
              </div>

              @if (loadingCalendars()) {
                <div class="py-12 text-center text-sm text-slate-400">Loading work calendars…</div>
              } @else if (calendars().length === 0) {
                <div class="rounded-xl border border-dashed border-slate-200 py-12 text-center">
                  <p class="text-sm font-medium text-slate-600">No calendars configured</p>
                  <p class="mt-1 text-xs text-slate-400">Create a calendar for a country and year (e.g. TN-2026).</p>
                </div>
              } @else {
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  @for (cal of calendars(); track cal.id) {
                    <div
                      class="rounded-xl border p-4 transition cursor-pointer relative"
                      [ngClass]="selectedCalendar()?.id === cal.id ? 'border-indigo-950 bg-indigo-50/40 ring-1 ring-indigo-950' : 'border-slate-200 bg-white hover:border-slate-300'"
                      (click)="selectCalendar(cal)"
                    >
                      <div class="flex items-start justify-between">
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="font-mono text-xs font-bold text-slate-900">{{ cal.code }}</span>
                            <span class="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                              {{ cal.country }}
                            </span>
                          </div>
                          <h3 class="font-semibold text-slate-900 text-sm mt-1">{{ cal.name }}</h3>
                          <p class="text-xs text-slate-500 mt-0.5">Year: {{ cal.year }}</p>
                        </div>
                        <div class="flex items-center gap-1" (click)="$event.stopPropagation()">
                          <button
                            type="button"
                            (click)="openEditCalendar(cal)"
                            title="Edit calendar"
                            class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            (click)="openDeleteCalendar(cal)"
                            title="Delete calendar"
                            class="rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                        <span class="font-medium text-slate-600">
                          {{ selectedCalendar()?.id === cal.id ? 'Currently Selected' : 'Click to View Days' }}
                        </span>
                        @if (selectedCalendar()?.id === cal.id) {
                          <span class="text-indigo-950 font-bold">● Active</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </section>

            <!-- Calendar Days Detail View -->
            @if (selectedCalendar(); as currentCal) {
              <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div class="flex items-center gap-2">
                      <h2 class="text-base font-semibold text-slate-900">Schedule & Holidays: {{ currentCal.name }}</h2>
                      <span class="rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-900 font-mono">
                        {{ currentCal.code }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500 mt-0.5">
                      Configured holidays and non-standard working days for {{ currentCal.country }} ({{ currentCal.year }})
                    </p>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="openAddDay()"
                      class="inline-flex items-center justify-center rounded-lg bg-indigo-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900"
                    >
                      + Add Day / Holiday
                    </button>
                  </div>
                </div>

                <!-- Day Type Filter Pills -->
                <div class="flex items-center gap-2 py-4">
                  <button
                    type="button"
                    (click)="selectedDayTypeFilter.set('ALL')"
                    [ngClass]="selectedDayTypeFilter() === 'ALL' ? 'bg-indigo-950 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                    class="rounded-full px-3 py-1 text-xs transition"
                  >
                    All Days ({{ calendarDays().length }})
                  </button>
                  <button
                    type="button"
                    (click)="selectedDayTypeFilter.set('PUBLIC_HOLIDAY')"
                    [ngClass]="selectedDayTypeFilter() === 'PUBLIC_HOLIDAY' ? 'bg-indigo-950 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                    class="rounded-full px-3 py-1 text-xs transition"
                  >
                    Public Holidays
                  </button>
                  <button
                    type="button"
                    (click)="selectedDayTypeFilter.set('SPECIAL_NON_WORKING_DAY')"
                    [ngClass]="selectedDayTypeFilter() === 'SPECIAL_NON_WORKING_DAY' ? 'bg-indigo-950 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                    class="rounded-full px-3 py-1 text-xs transition"
                  >
                    Special Non-Working
                  </button>
                  <button
                    type="button"
                    (click)="selectedDayTypeFilter.set('SPECIAL_WORKING_DAY')"
                    [ngClass]="selectedDayTypeFilter() === 'SPECIAL_WORKING_DAY' ? 'bg-indigo-950 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                    class="rounded-full px-3 py-1 text-xs transition"
                  >
                    Special Working
                  </button>
                </div>

                @if (loadingDays()) {
                  <div class="py-12 text-center text-sm text-slate-400">Loading schedule days…</div>
                } @else if (filteredDays().length === 0) {
                  <div class="rounded-xl border border-dashed border-slate-200 py-12 text-center">
                    <p class="text-sm font-medium text-slate-600">No special days found</p>
                    <p class="mt-1 text-xs text-slate-400">Add public holidays or non-working days for this calendar.</p>
                  </div>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                      <thead class="border-b border-slate-200 bg-slate-50/75 text-xs uppercase text-slate-500">
                        <tr>
                          <th class="px-4 py-3">Date</th>
                          <th class="px-4 py-3">Event Label</th>
                          <th class="px-4 py-3">Day Type</th>
                          <th class="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        @for (d of filteredDays(); track d.id) {
                          <tr class="hover:bg-slate-50/50 transition">
                            <td class="px-4 py-3.5 font-mono text-xs font-semibold text-slate-900">
                              {{ d.date }}
                            </td>
                            <td class="px-4 py-3.5 font-medium text-slate-900">
                              {{ d.label }}
                            </td>
                            <td class="px-4 py-3.5">
                              <span
                                class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                [ngClass]="getDayTypeBadgeClass(d.dayType)"
                              >
                                {{ formatDayType(d.dayType) }}
                              </span>
                            </td>
                            <td class="px-4 py-3.5 text-right">
                              <div class="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  (click)="openEditDay(d)"
                                  class="rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  (click)="openDeleteDay(d)"
                                  class="rounded border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </section>
            }
          </div>
        }

        <!-- ========================================================= -->
        <!-- 4. COMPANY SETTINGS TAB                                   -->
        <!-- ========================================================= -->
        @if (activeTab() === 'settings') {
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-4xl">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-100">
              <div>
                <h2 class="text-base font-semibold text-slate-900">Organization Settings & Working Rules</h2>
                <p class="text-xs text-slate-500">Company legal entity, default country jurisdiction, and weekly rest schedule</p>
              </div>
              <button
                type="button"
                (click)="openEditSettings()"
                class="inline-flex items-center justify-center rounded-lg bg-indigo-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900"
              >
                Edit Settings
              </button>
            </div>

            @if (loadingSettings()) {
              <div class="py-16 text-center text-sm text-slate-400">Loading organization settings…</div>
            } @else if (settings(); as s) {
              <div class="py-6 space-y-6">
                <!-- Company Overview Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Company Name</p>
                    <p class="mt-1 text-lg font-bold text-slate-900">{{ s.companyName }}</p>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Primary Jurisdiction</p>
                    <p class="mt-1 text-lg font-bold text-slate-900">
                      {{ s.country === 'TN' ? 'Tunisia (TN)' : 'France (FR)' }}
                    </p>
                  </div>
                </div>

                <!-- Weekend Schedule -->
                <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-3">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">Configured Weekend Days</h3>
                  <p class="text-xs text-slate-500">
                    Days excluded from leave duration calculation unless covered by a special schedule
                  </p>
                  <div class="flex flex-wrap gap-2 pt-1">
                    @for (day of daysOfWeek; track day.value) {
                      <span
                        class="rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
                        [ngClass]="s.weekendDays.includes(day.value) ? 'bg-indigo-950 text-white' : 'bg-slate-200/70 text-slate-500'"
                      >
                        {{ day.label }}
                        @if (s.weekendDays.includes(day.value)) {
                          <span>(Weekend)</span>
                        }
                      </span>
                    }
                  </div>
                </div>

                <!-- Metadata Footer -->
                <div class="pt-4 border-t border-slate-100 flex flex-wrap gap-6 text-xs text-slate-400">
                  <span>Created: {{ s.createdAt || 'Initial seed' }}</span>
                  <span>Last Updated: {{ s.updatedAt || '—' }}</span>
                </div>
              </div>
            }
          </section>
        }

        <!-- ========================================================= -->
        <!-- MODALS                                                    -->
        <!-- ========================================================= -->

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

        <!-- MODAL: ADD / EDIT CALENDAR -->
        @if (showCalendarModal()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div class="flex items-center justify-between pb-3">
                <h3 class="text-base font-semibold text-slate-900">
                  {{ editingCalendarId() ? 'Edit Calendar' : 'Create Work Calendar' }}
                </h3>
                <button type="button" (click)="showCalendarModal.set(false)" class="text-slate-400 hover:text-slate-600">&times;</button>
              </div>
              <form (ngSubmit)="saveCalendar()" class="space-y-4">
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700">Calendar Code *</label>
                  <input
                    type="text"
                    [(ngModel)]="calendarCode"
                    name="calendarCode"
                    required
                    [disabled]="!!editingCalendarId()"
                    placeholder="e.g. TN-2026, FR-2026"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-950 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  @if (editingCalendarId()) {
                    <p class="text-[11px] text-slate-400 mt-1">Calendar code cannot be changed once created.</p>
                  }
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700">Display Name *</label>
                  <input
                    type="text"
                    [(ngModel)]="calendarName"
                    name="calendarName"
                    required
                    placeholder="e.g. Tunisia Official Calendar 2026"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-950 focus:outline-none"
                  />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Country *</label>
                    <select
                      [(ngModel)]="calendarCountry"
                      name="calendarCountry"
                      required
                      class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-950 focus:outline-none bg-white"
                    >
                      <option value="TN">Tunisia (TN)</option>
                      <option value="FR">France (FR)</option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-700">Year *</label>
                    <input
                      type="number"
                      [(ngModel)]="calendarYear"
                      name="calendarYear"
                      required
                      min="2020"
                      max="2035"
                      class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-950 focus:outline-none"
                    />
                  </div>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    (click)="showCalendarModal.set(false)"
                    class="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    [disabled]="saving() || !calendarCode.trim() || !calendarName.trim()"
                    class="rounded-lg bg-indigo-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900 disabled:opacity-50"
                  >
                    {{ saving() ? 'Saving…' : (editingCalendarId() ? 'Update Calendar' : 'Create Calendar') }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- MODAL: DELETE CALENDAR CONFIRMATION -->
        @if (showDeleteCalendarModal() && calendarToDelete(); as cal) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <h3 class="text-base font-bold text-slate-900">Delete Calendar</h3>
              <p class="text-sm text-slate-600">
                Are you sure you want to delete <span class="font-semibold text-slate-900">{{ cal.name }} ({{ cal.code }})</span>?
              </p>
              <div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <strong>Warning:</strong> This will permanently delete the calendar and all public holidays or special days configured under it.
              </div>
              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  (click)="showDeleteCalendarModal.set(false)"
                  class="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  (click)="confirmDeleteCalendar()"
                  [disabled]="saving()"
                  class="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-50"
                >
                  {{ saving() ? 'Deleting…' : 'Delete Calendar' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- MODAL: ADD / EDIT CALENDAR DAY -->
        @if (showDayModal()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div class="flex items-center justify-between pb-3">
                <h3 class="text-base font-semibold text-slate-900">
                  {{ editingDayId() ? 'Edit Day / Holiday' : 'Add Special Day / Holiday' }}
                </h3>
                <button type="button" (click)="showDayModal.set(false)" class="text-slate-400 hover:text-slate-600">&times;</button>
              </div>
              <form (ngSubmit)="saveDay()" class="space-y-4">
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700">Date *</label>
                  <input
                    type="date"
                    [(ngModel)]="dayDate"
                    name="dayDate"
                    required
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-950 focus:outline-none"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700">Event Label *</label>
                  <input
                    type="text"
                    [(ngModel)]="dayLabel"
                    name="dayLabel"
                    required
                    placeholder="e.g. Independence Day, New Year's Day"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-950 focus:outline-none"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700">Day Type *</label>
                  <select
                    [(ngModel)]="dayType"
                    name="dayType"
                    required
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-950 focus:outline-none bg-white"
                  >
                    <option value="PUBLIC_HOLIDAY">Public Holiday</option>
                    <option value="SPECIAL_NON_WORKING_DAY">Special Non-Working Day</option>
                    <option value="SPECIAL_WORKING_DAY">Special Working Day</option>
                  </select>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    (click)="showDayModal.set(false)"
                    class="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    [disabled]="saving() || !dayDate || !dayLabel.trim()"
                    class="rounded-lg bg-indigo-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900 disabled:opacity-50"
                  >
                    {{ saving() ? 'Saving…' : (editingDayId() ? 'Update Day' : 'Add Day') }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- MODAL: DELETE CALENDAR DAY CONFIRMATION -->
        @if (showDeleteDayModal() && dayToDelete(); as day) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <h3 class="text-base font-bold text-slate-900">Delete Day</h3>
              <p class="text-sm text-slate-600">
                Are you sure you want to delete <span class="font-semibold text-slate-900">{{ day.label }} ({{ day.date }})</span>?
              </p>
              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  (click)="showDeleteDayModal.set(false)"
                  class="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  (click)="confirmDeleteDay()"
                  [disabled]="saving()"
                  class="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-50"
                >
                  {{ saving() ? 'Deleting…' : 'Delete Day' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- MODAL: EDIT COMPANY SETTINGS -->
        @if (showSettingsModal()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div class="flex items-center justify-between pb-3">
                <h3 class="text-base font-semibold text-slate-900">Edit Organization Settings</h3>
                <button type="button" (click)="showSettingsModal.set(false)" class="text-slate-400 hover:text-slate-600">&times;</button>
              </div>
              <form (ngSubmit)="saveSettings()" class="space-y-4">
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700">Company Name *</label>
                  <input
                    type="text"
                    [(ngModel)]="editCompanyName"
                    name="editCompanyName"
                    required
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-950 focus:outline-none"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-700">Primary Country Jurisdiction *</label>
                  <select
                    [(ngModel)]="editCountry"
                    name="editCountry"
                    required
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-950 focus:outline-none bg-white"
                  >
                    <option value="TN">Tunisia (TN)</option>
                    <option value="FR">France (FR)</option>
                  </select>
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-medium text-slate-700">Official Weekend Days *</label>
                  <p class="text-xs text-slate-500 mb-2">Select the days that constitute the company weekend:</p>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    @for (day of daysOfWeek; track day.value) {
                      <label
                        class="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition select-none"
                        [ngClass]="editWeekendDays.includes(day.value) ? 'border-indigo-950 bg-indigo-50/50 font-semibold text-indigo-950' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                      >
                        <input
                          type="checkbox"
                          [checked]="editWeekendDays.includes(day.value)"
                          (change)="toggleWeekendDay(day.value)"
                          class="rounded border-slate-300 text-indigo-950 focus:ring-indigo-950"
                        />
                        {{ day.label }}
                      </label>
                    }
                  </div>
                </div>

                <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    (click)="showSettingsModal.set(false)"
                    class="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    [disabled]="saving() || !editCompanyName.trim() || editWeekendDays.length === 0"
                    class="rounded-lg bg-indigo-950 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900 disabled:opacity-50"
                  >
                    {{ saving() ? 'Saving…' : 'Save Settings' }}
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
  private readonly calendarService = inject(CalendarAdminService);
  readonly auth = inject(AuthService);

  readonly daysOfWeek = DAYS_OF_WEEK;

  readonly activeTab = signal<ManagementTab>('departments');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Departments & Positions State
  readonly departments = signal<DepartmentResponse[]>([]);
  readonly positions = signal<PositionResponse[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  // Department Modal
  readonly showAddDeptModal = signal(false);
  newDeptLabel = '';

  // Position Modal
  readonly showPositionModal = signal(false);
  readonly editingPositionId = signal<string | null>(null);
  positionTitle = '';
  positionDepartmentId = '';

  // Calendars & Holidays State
  readonly calendars = signal<CalendarDto[]>([]);
  readonly selectedCalendar = signal<CalendarDto | null>(null);
  readonly calendarDays = signal<CalendarDayDto[]>([]);
  readonly loadingCalendars = signal(false);
  readonly loadingDays = signal(false);
  readonly selectedDayTypeFilter = signal<string>('ALL');

  readonly filteredDays = computed(() => {
    const list = this.calendarDays();
    const filter = this.selectedDayTypeFilter();
    if (filter === 'ALL') return list;
    return list.filter((d) => d.dayType === filter);
  });

  // Calendar Modals
  readonly showCalendarModal = signal(false);
  readonly editingCalendarId = signal<string | null>(null);
  calendarCode = '';
  calendarName = '';
  calendarCountry: CountryCode = 'TN';
  calendarYear = new Date().getFullYear();

  readonly showDeleteCalendarModal = signal(false);
  readonly calendarToDelete = signal<CalendarDto | null>(null);

  // Calendar Day Modals
  readonly showDayModal = signal(false);
  readonly editingDayId = signal<string | null>(null);
  dayDate = '';
  dayLabel = '';
  dayType: DayType = 'PUBLIC_HOLIDAY';

  readonly showDeleteDayModal = signal(false);
  readonly dayToDelete = signal<CalendarDayDto | null>(null);

  // Organization Settings State
  readonly settings = signal<OrganizationSettingsResponse | null>(null);
  readonly loadingSettings = signal(false);
  readonly showSettingsModal = signal(false);
  editCompanyName = '';
  editCountry: CountryCode = 'TN';
  editWeekendDays: number[] = [6, 7];

  ngOnInit(): void {
    this.loadData();
    this.loadCalendars();
    this.loadSettings();
  }

  setTab(tab: ManagementTab): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (tab === 'calendars' && this.calendars().length === 0) {
      this.loadCalendars();
    } else if (tab === 'settings' && !this.settings()) {
      this.loadSettings();
    }
  }

  // =========================================================
  // DEPARTMENTS & POSITIONS
  // =========================================================

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

  // =========================================================
  // CALENDARS & DAYS
  // =========================================================

  loadCalendars(): void {
    this.loadingCalendars.set(true);
    this.calendarService.listCalendars().subscribe({
      next: (res) => {
        const list = res.data || [];
        this.calendars.set(list);
        this.loadingCalendars.set(false);
        if (list.length > 0 && !this.selectedCalendar()) {
          this.selectCalendar(list[0]);
        }
      },
      error: (err) => {
        this.loadingCalendars.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to load calendars.');
      },
    });
  }

  selectCalendar(cal: CalendarDto): void {
    this.selectedCalendar.set(cal);
    if (cal.id) {
      this.loadCalendarDays(cal.id);
    }
  }

  loadCalendarDays(calendarId: string): void {
    this.loadingDays.set(true);
    this.calendarService.listCalendarDays(calendarId).subscribe({
      next: (res) => {
        this.calendarDays.set(res.data || []);
        this.loadingDays.set(false);
      },
      error: (err) => {
        this.loadingDays.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to load calendar days.');
      },
    });
  }

  openAddCalendar(): void {
    this.editingCalendarId.set(null);
    this.calendarCode = '';
    this.calendarName = '';
    this.calendarCountry = 'TN';
    this.calendarYear = new Date().getFullYear();
    this.showCalendarModal.set(true);
  }

  openEditCalendar(cal: CalendarDto): void {
    this.editingCalendarId.set(cal.id || null);
    this.calendarCode = cal.code;
    this.calendarName = cal.name;
    this.calendarCountry = cal.country;
    this.calendarYear = cal.year;
    this.showCalendarModal.set(true);
  }

  saveCalendar(): void {
    if (!this.calendarCode.trim() || !this.calendarName.trim()) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const dto: CalendarDto = {
      code: this.calendarCode.trim(),
      name: this.calendarName.trim(),
      country: this.calendarCountry,
      year: this.calendarYear,
    };

    const id = this.editingCalendarId();
    if (id) {
      this.calendarService.updateCalendar(id, dto).subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.showCalendarModal.set(false);
          this.successMessage.set(`Calendar "${updated.name}" updated.`);
          this.loadCalendars();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to update calendar.');
        },
      });
    } else {
      this.calendarService.createCalendar(dto).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.showCalendarModal.set(false);
          this.successMessage.set(`Calendar "${created.name}" created.`);
          this.loadCalendars();
          this.selectCalendar(created);
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to create calendar.');
        },
      });
    }
  }

  openDeleteCalendar(cal: CalendarDto): void {
    this.calendarToDelete.set(cal);
    this.showDeleteCalendarModal.set(true);
  }

  confirmDeleteCalendar(): void {
    const cal = this.calendarToDelete();
    if (!cal?.id) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.calendarService.deleteCalendar(cal.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.showDeleteCalendarModal.set(false);
        this.successMessage.set(`Calendar "${cal.name}" deleted.`);
        if (this.selectedCalendar()?.id === cal.id) {
          this.selectedCalendar.set(null);
          this.calendarDays.set([]);
        }
        this.loadCalendars();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to delete calendar.');
      },
    });
  }

  openAddDay(): void {
    const sel = this.selectedCalendar();
    this.editingDayId.set(null);
    const yr = sel?.year || new Date().getFullYear();
    this.dayDate = `${yr}-01-01`;
    this.dayLabel = '';
    this.dayType = 'PUBLIC_HOLIDAY';
    this.showDayModal.set(true);
  }

  openEditDay(day: CalendarDayDto): void {
    this.editingDayId.set(day.id || null);
    this.dayDate = day.date;
    this.dayLabel = day.label;
    this.dayType = day.dayType;
    this.showDayModal.set(true);
  }

  saveDay(): void {
    const cal = this.selectedCalendar();
    if (!cal?.id || !this.dayDate || !this.dayLabel.trim()) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const dto: CalendarDayDto = {
      date: this.dayDate,
      label: this.dayLabel.trim(),
      dayType: this.dayType,
    };

    const dayId = this.editingDayId();
    if (dayId) {
      this.calendarService.updateCalendarDay(cal.id, dayId, dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.showDayModal.set(false);
          this.successMessage.set(`Day "${dto.label}" updated.`);
          this.loadCalendarDays(cal.id!);
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to update calendar day.');
        },
      });
    } else {
      this.calendarService.createCalendarDay(cal.id, dto).subscribe({
        next: () => {
          this.saving.set(false);
          this.showDayModal.set(false);
          this.successMessage.set(`Day "${dto.label}" added.`);
          this.loadCalendarDays(cal.id!);
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to create calendar day.');
        },
      });
    }
  }

  openDeleteDay(day: CalendarDayDto): void {
    this.dayToDelete.set(day);
    this.showDeleteDayModal.set(true);
  }

  confirmDeleteDay(): void {
    const cal = this.selectedCalendar();
    const day = this.dayToDelete();
    if (!cal?.id || !day?.id) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.calendarService.deleteCalendarDay(cal.id, day.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.showDeleteDayModal.set(false);
        this.successMessage.set(`Day "${day.label}" deleted.`);
        this.loadCalendarDays(cal.id!);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to delete calendar day.');
      },
    });
  }

  formatDayType(type: DayType): string {
    switch (type) {
      case 'PUBLIC_HOLIDAY':
        return 'Public Holiday';
      case 'SPECIAL_NON_WORKING_DAY':
        return 'Special Non-Working';
      case 'SPECIAL_WORKING_DAY':
        return 'Special Working';
      default:
        return type;
    }
  }

  getDayTypeBadgeClass(type: DayType): string {
    switch (type) {
      case 'PUBLIC_HOLIDAY':
        return 'bg-emerald-100 text-emerald-800';
      case 'SPECIAL_NON_WORKING_DAY':
        return 'bg-purple-100 text-purple-800';
      case 'SPECIAL_WORKING_DAY':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  // =========================================================
  // ORGANIZATION SETTINGS
  // =========================================================

  loadSettings(): void {
    this.loadingSettings.set(true);
    this.orgService.getSettings().subscribe({
      next: (res) => {
        this.settings.set(res);
        this.loadingSettings.set(false);
      },
      error: (err) => {
        this.loadingSettings.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to load organization settings.');
      },
    });
  }

  openEditSettings(): void {
    const s = this.settings();
    if (!s) return;
    this.editCompanyName = s.companyName;
    this.editCountry = s.country;
    this.editWeekendDays = [...s.weekendDays];
    this.showSettingsModal.set(true);
  }

  toggleWeekendDay(dayValue: number): void {
    const idx = this.editWeekendDays.indexOf(dayValue);
    if (idx > -1) {
      this.editWeekendDays.splice(idx, 1);
    } else {
      this.editWeekendDays.push(dayValue);
      this.editWeekendDays.sort((a, b) => a - b);
    }
  }

  saveSettings(): void {
    if (!this.editCompanyName.trim() || this.editWeekendDays.length === 0) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.orgService
      .updateSettings({
        companyName: this.editCompanyName.trim(),
        country: this.editCountry,
        weekendDays: this.editWeekendDays,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.settings.set(updated);
          this.showSettingsModal.set(false);
          this.successMessage.set('Organization settings updated successfully.');
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to update organization settings.');
        },
      });
  }
}
