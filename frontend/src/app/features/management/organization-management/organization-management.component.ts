import { HeaderComponent } from '../../../core/layout/header/header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import {
  UserAdminService,
  UserResponse,
  AccountStatus,
} from '../../../core/services/user-admin.service';
import {
  EmployeeAdminService,
  EmployeeResponse,
} from '../../../core/services/employee-admin.service';
import {
  LeavePolicyAdminService,
  LeavePolicyResponse,
  CreateLeavePolicyRequest,
  LeaveBonus,
  AccrualUnit,
  BonusApplication,
} from '../../../core/services/leave-policy-admin.service';
import { LeaveTypeCode } from '../../../core/services/leave-request.service';
import {
  LeaveLedgerAdminService,
  LeaveLedgerResponse,
  LedgerMovement,
  LedgerMovementType,
  LeaveAdjustmentRequest,
} from '../../../core/services/leave-ledger-admin.service';

type ManagementTab =
  | 'departments'
  | 'positions'
  | 'calendars'
  | 'settings'
  | 'users'
  | 'policies'
  | 'ledgers';

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
  imports: [CommonModule, FormsModule, HeaderComponent, StatusBadgeComponent],
  templateUrl: './organization-management.component.html',
  styleUrl: './organization-management.component.scss',
})
export class OrganizationManagementComponent implements OnInit {
  private readonly orgService = inject(OrganizationService);
  private readonly calendarService = inject(CalendarAdminService);
  private readonly userAdminService = inject(UserAdminService);
  private readonly employeeAdminService = inject(EmployeeAdminService);
  private readonly policyService = inject(LeavePolicyAdminService);
  private readonly ledgerAdminService = inject(LeaveLedgerAdminService);
  readonly auth = inject(AuthService);

  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  readonly canManagePolicies = computed(() => this.auth.hasAnyRole('HR', 'ADMIN'));

  readonly daysOfWeek = DAYS_OF_WEEK;

  readonly activeTab = signal<ManagementTab>('departments');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Departments & Positions State
  readonly departments = signal<DepartmentResponse[]>([]);
  readonly positions = signal<PositionResponse[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly departmentSearch = signal('');
  readonly positionSearch = signal('');
  readonly positionDeptFilter = signal('ALL');

  readonly totalActiveEmployees = computed(() => {
    return this.allEmployees().filter((e) => e.employmentStatus === 'ACTIVE').length;
  });

  readonly filteredDepartments = computed(() => {
    const query = this.departmentSearch().toLowerCase().trim();
    const list = this.departments();
    if (!query) return list;
    return list.filter((d) => d.label.toLowerCase().includes(query));
  });

  readonly filteredPositions = computed(() => {
    const query = this.positionSearch().toLowerCase().trim();
    const deptFilter = this.positionDeptFilter();
    let list = this.positions();
    if (deptFilter !== 'ALL') {
      list = list.filter((p) => p.departmentId === deptFilter);
    }
    if (query) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          this.getDepartmentLabel(p.departmentId).toLowerCase().includes(query)
      );
    }
    return list;
  });

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

  // System Users State
  readonly users = signal<UserResponse[]>([]);
  readonly loadingUsers = signal(false);
  readonly userStatusFilter = signal<string>('ALL');
  readonly allEmployees = signal<EmployeeResponse[]>([]);

  readonly filteredUsers = computed(() => {
    const list = this.users();
    const filter = this.userStatusFilter();
    if (filter === 'ALL') return list;
    return list.filter((u) => u.accountStatus === filter);
  });

  // System User Modals
  readonly showAddUserModal = signal(false);
  userEmail = '';
  userEmployeeId = '';

  readonly showEditUserModal = signal(false);
  readonly editingUser = signal<UserResponse | null>(null);
  editAccountStatus: AccountStatus = 'ACTIVE';
  editUserEmployeeId = '';

  // Leave Policies State
  readonly policies = signal<LeavePolicyResponse[]>([]);
  readonly loadingPolicies = signal(false);
  readonly policyCountryFilter = signal<string>('ALL');
  readonly policyTypeFilter = signal<string>('ALL');

  readonly filteredPolicies = computed(() => {
    let list = this.policies();
    const cFilter = this.policyCountryFilter();
    if (cFilter !== 'ALL') {
      list = list.filter((p) => p.country === cFilter);
    }
    const tFilter = this.policyTypeFilter();
    if (tFilter !== 'ALL') {
      list = list.filter((p) => p.leaveTypeCode === tFilter);
    }
    return list;
  });

  // Leave Policy Modal State
  readonly showPolicyModal = signal(false);
  policyCountry: CountryCode = 'TN';
  policyLeaveTypeCode: LeaveTypeCode = 'PAID_ANNUAL';
  policyAccrualUnit: AccrualUnit = 'WORKING_DAY';
  policyAccrualRate: number = 1.83;
  policyMaxBalance: number | null = 30;
  policyMinBlockDays: number | null = null;
  policyNoticeDays: number | null = 3;
  policyBonuses: LeaveBonus[] = [];

  // Bonus sub-form state
  showAddBonusForm = false;
  newBonusLabel = '';
  newBonusAppliesTo: BonusApplication = 'RATE';
  newBonusAmount = 1;
  newBonusMinYears: number | null = 5;
  newBonusEveryNYears: number | null = 5;
  newBonusMaxAge: number | null = null;

  ngOnInit(): void {
    this.loadData();
    this.loadCalendars();
    this.loadSettings();
    this.loadUsers();
    this.loadEmployees();
    this.loadPolicies();
  }

  setTab(tab: ManagementTab): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (tab === 'calendars' && this.calendars().length === 0) {
      this.loadCalendars();
    } else if (tab === 'settings' && !this.settings()) {
      this.loadSettings();
    } else if (tab === 'users' && this.users().length === 0) {
      this.loadUsers();
    } else if (tab === 'policies' && this.policies().length === 0) {
      this.loadPolicies();
    } else if (tab === 'ledgers') {
      const empId = this.selectedEmployeeId() || this.allEmployees()[0]?.id;
      if (empId) {
        if (!this.selectedEmployeeId()) {
          this.selectedEmployeeId.set(empId);
        }
        this.loadEmployeeLedgers(empId);
      }
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

  getEmployeesInDepartment(deptId: string): EmployeeResponse[] {
    const dept = this.departments().find((d) => d.id === deptId);
    const label = dept?.label;
    return this.allEmployees().filter(
      (e) =>
        e.currentAssignment?.departmentId === deptId ||
        (label && e.currentAssignment?.departmentLabel === label)
    );
  }

  getActiveCountForDepartment(deptId: string): number {
    return this.getEmployeesInDepartment(deptId).filter(
      (e) => e.employmentStatus === 'ACTIVE'
    ).length;
  }

  getDepartmentWorkforceShare(deptId: string): number {
    const total = this.totalActiveEmployees();
    if (total === 0) return 0;
    const count = this.getActiveCountForDepartment(deptId);
    return Math.round((count / total) * 100);
  }

  getDepartmentManagers(deptId: string): string[] {
    const employees = this.getEmployeesInDepartment(deptId);
    const mgrNames = new Set<string>();

    for (const emp of employees) {
      if (emp.currentManager?.name) {
        mgrNames.add(emp.currentManager.name);
      }
    }

    for (const emp of employees) {
      const posTitle = emp.currentAssignment?.positionLabel?.toLowerCase() || '';
      if (posTitle.includes('manager') || posTitle.includes('lead') || posTitle.includes('director') || posTitle.includes('head')) {
        mgrNames.add(`${emp.profile.firstName} ${emp.profile.lastName}`);
      }
    }

    return Array.from(mgrNames);
  }

  getEmployeesInPosition(posId: string, posTitle?: string): EmployeeResponse[] {
    return this.allEmployees().filter(
      (e) =>
        e.currentAssignment?.positionId === posId ||
        (posTitle && e.currentAssignment?.positionLabel === posTitle)
    );
  }

  getActiveCountForPosition(posId: string, posTitle?: string): number {
    return this.getEmployeesInPosition(posId, posTitle).filter(
      (e) => e.employmentStatus === 'ACTIVE'
    ).length;
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

  // =========================================================
  // SYSTEM USERS
  // =========================================================

  loadUsers(): void {
    this.loadingUsers.set(true);
    this.userAdminService.listUsers().subscribe({
      next: (res) => {
        this.users.set(res.data || []);
        this.loadingUsers.set(false);
      },
      error: (err) => {
        this.loadingUsers.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to load system users.');
      },
    });
  }

  loadEmployees(): void {
    this.employeeAdminService.listEmployees().subscribe({
      next: (res) => {
        const list = res.data || [];
        this.allEmployees.set(list);
        if (list.length > 0 && !this.selectedEmployeeId()) {
          this.selectedEmployeeId.set(list[0].id);
          if (this.activeTab() === 'ledgers') {
            this.loadEmployeeLedgers(list[0].id);
          }
        }
      },
      error: () => {
        // non-blocking lookup helper
      },
    });
  }

  getLinkedEmployeeName(empId?: string): string {
    if (!empId) return 'Standalone / Unlinked';
    const emp = this.allEmployees().find((e) => e.id === empId);
    if (!emp) return empId;
    return `${emp.profile.firstName} ${emp.profile.lastName} (${emp.employeeNumber})`;
  }

  openAddUser(): void {
    this.userEmail = '';
    this.userEmployeeId = '';
    this.showAddUserModal.set(true);
  }

  saveNewUser(): void {
    if (!this.userEmail.trim()) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.userAdminService
      .createUser({
        email: this.userEmail.trim(),
        employeeId: this.userEmployeeId.trim() ? this.userEmployeeId.trim() : undefined,
      })
      .subscribe({
        next: (created) => {
          this.saving.set(false);
          this.showAddUserModal.set(false);
          this.successMessage.set(`System user "${created.email}" created with status PENDING_ACTIVATION.`);
          this.loadUsers();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to create user.');
        },
      });
  }

  openEditUser(user: UserResponse): void {
    this.editingUser.set(user);
    this.editAccountStatus = user.accountStatus;
    this.editUserEmployeeId = user.employeeId || '';
    this.showEditUserModal.set(true);
  }

  saveEditUser(): void {
    const user = this.editingUser();
    if (!user) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.userAdminService
      .updateUser(user.id, {
        accountStatus: this.editAccountStatus,
        employeeId: this.editUserEmployeeId, // Send '' to unlink or empId to link
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.showEditUserModal.set(false);
          this.successMessage.set(`User "${updated.email}" updated successfully.`);
          this.loadUsers();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to update user.');
        },
      });
  }

  getUserStatusClass(status: AccountStatus): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-800';
      case 'PENDING_ACTIVATION':
        return 'bg-amber-100 text-amber-800';
      case 'SUSPENDED':
        return 'bg-rose-100 text-rose-800';
      case 'ARCHIVED':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  getUserStatusLabel(status: AccountStatus): string {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'PENDING_ACTIVATION':
        return 'Pending Activation';
      case 'SUSPENDED':
        return 'Suspended';
      case 'ARCHIVED':
        return 'Archived';
      default:
        return status;
    }
  }

  // =========================================================
  // LEAVE POLICIES
  // =========================================================

  loadPolicies(): void {
    this.loadingPolicies.set(true);
    this.policyService.listLeavePolicies().subscribe({
      next: (res) => {
        this.policies.set(res.data || []);
        this.loadingPolicies.set(false);
      },
      error: (err) => {
        this.loadingPolicies.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to load leave policies.');
      },
    });
  }

  openCreatePolicy(): void {
    this.policyCountry = 'TN';
    this.policyLeaveTypeCode = 'PAID_ANNUAL';
    this.policyAccrualUnit = 'WORKING_DAY';
    this.policyAccrualRate = 1.83;
    this.policyMaxBalance = 30;
    this.policyMinBlockDays = null;
    this.policyNoticeDays = 3;
    this.policyBonuses = [];
    this.showAddBonusForm = false;
    this.showPolicyModal.set(true);
  }

  openClonePolicy(p: LeavePolicyResponse): void {
    this.policyCountry = p.country;
    this.policyLeaveTypeCode = p.leaveTypeCode;
    this.policyAccrualUnit = p.accrualUnit;
    this.policyAccrualRate = p.accrualRate;
    this.policyMaxBalance = p.maxBalance ?? null;
    this.policyMinBlockDays = p.minBlockDays ?? null;
    this.policyNoticeDays = p.noticeDays ?? null;
    this.policyBonuses = (p.bonuses || []).map((b) => ({ ...b }));
    this.showAddBonusForm = false;
    this.showPolicyModal.set(true);
  }

  addBonusRule(): void {
    if (!this.newBonusLabel.trim() || this.newBonusAmount <= 0) return;
    this.policyBonuses.push({
      label: this.newBonusLabel.trim(),
      appliesTo: this.newBonusAppliesTo,
      isOverride: false,
      amount: this.newBonusAmount,
      minYearsOfService: this.newBonusMinYears ? Number(this.newBonusMinYears) : null,
      everyNYears: this.newBonusEveryNYears ? Number(this.newBonusEveryNYears) : null,
      maxAge: this.newBonusMaxAge ? Number(this.newBonusMaxAge) : null,
    });
    this.newBonusLabel = '';
    this.newBonusAmount = 1;
    this.showAddBonusForm = false;
  }

  removeBonusRule(index: number): void {
    this.policyBonuses.splice(index, 1);
  }

  savePolicy(): void {
    if (!this.policyCountry || !this.policyLeaveTypeCode || !this.policyAccrualUnit) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const req: CreateLeavePolicyRequest = {
      country: this.policyCountry,
      leaveTypeCode: this.policyLeaveTypeCode,
      accrualUnit: this.policyAccrualUnit,
      accrualRate: Number(this.policyAccrualRate) || 0,
      maxBalance:
        this.policyMaxBalance !== null &&
        this.policyMaxBalance !== undefined &&
        this.policyMaxBalance !== ('' as any)
          ? Number(this.policyMaxBalance)
          : null,
      minBlockDays:
        this.policyMinBlockDays !== null &&
        this.policyMinBlockDays !== undefined &&
        this.policyMinBlockDays !== ('' as any)
          ? Number(this.policyMinBlockDays)
          : null,
      noticeDays:
        this.policyNoticeDays !== null &&
        this.policyNoticeDays !== undefined &&
        this.policyNoticeDays !== ('' as any)
          ? Number(this.policyNoticeDays)
          : null,
      bonuses: this.policyBonuses,
    };

    this.policyService.createLeavePolicy(req).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.showPolicyModal.set(false);
        this.successMessage.set(
          `New policy version created for ${created.country} - ${created.leaveTypeCode} successfully.`
        );
        this.loadPolicies();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to create leave policy version.');
      },
    });
  }

  getLeaveTypeBadgeClass(code: string): string {
    switch (code) {
      case 'PAID_ANNUAL':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SICK':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'UNPAID':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'MATERNITY':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  getLeaveTypeLabel(code: string): string {
    switch (code) {
      case 'PAID_ANNUAL':
        return 'Paid Annual';
      case 'SICK':
        return 'Sick Leave';
      case 'UNPAID':
        return 'Unpaid Leave';
      case 'MATERNITY':
        return 'Maternity Leave';
      default:
        return code;
    }
  }

  // =========================================================
  // LEAVE BALANCES & ADJUSTMENTS (LEDGERS)
  // =========================================================

  readonly selectedEmployeeId = signal<string>('');
  readonly selectedYear = signal<number>(new Date().getFullYear());
  readonly employeeLedgers = signal<LeaveLedgerResponse[]>([]);
  readonly loadingLedgers = signal<boolean>(false);
  readonly selectedLedgerForMovements = signal<LeaveLedgerResponse | null>(null);

  readonly availableYears: number[] = [
    new Date().getFullYear() + 1,
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
    new Date().getFullYear() - 2,
  ];

  readonly selectedEmployee = computed(() => {
    const id = this.selectedEmployeeId();
    return this.allEmployees().find((e) => e.id === id) || null;
  });

  readonly totalAvailableDays = computed(() => {
    return this.employeeLedgers().reduce((acc, l) => acc + (l.availableBalance || 0), 0);
  });

  readonly totalConsumedDays = computed(() => {
    return this.employeeLedgers().reduce((acc, l) => acc + (l.consumedBalance || 0), 0);
  });

  readonly totalAccruedDays = computed(() => {
    return this.employeeLedgers().reduce((acc, l) => acc + (l.accruedToDate || 0), 0);
  });

  readonly totalCarriedOverDays = computed(() => {
    return this.employeeLedgers().reduce((acc, l) => acc + (l.carriedOverFromPreviousYear || 0), 0);
  });

  // Modal State
  readonly showAdjustmentModal = signal(false);
  adjustmentEmployeeId = '';
  adjustmentLeaveTypeCode = 'PAID_ANNUAL';
  adjustmentYear = new Date().getFullYear();
  adjustmentAmount = 1;
  adjustmentType: LedgerMovementType = 'HR_ADJUSTMENT_CREDIT';
  adjustmentNote = '';

  loadEmployeeLedgers(empId?: string, year?: number): void {
    const id = empId || this.selectedEmployeeId();
    if (!id) return;
    const yr = year !== undefined ? year : this.selectedYear();
    this.loadingLedgers.set(true);
    this.ledgerAdminService.getEmployeeLedgers(id, yr).subscribe({
      next: (res) => {
        const list = res.data || [];
        this.employeeLedgers.set(list);
        this.loadingLedgers.set(false);
        if (list.length > 0) {
          const current = this.selectedLedgerForMovements();
          const match = list.find((l) => l.id === current?.id);
          this.selectedLedgerForMovements.set(match || list[0]);
        } else {
          this.selectedLedgerForMovements.set(null);
        }
      },
      error: (err) => {
        this.loadingLedgers.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to load employee leave ledgers.');
      },
    });
  }

  onSelectEmployeeForLedger(empId: string): void {
    this.selectedEmployeeId.set(empId);
    this.selectedLedgerForMovements.set(null);
    this.loadEmployeeLedgers(empId);
  }

  onSelectYearForLedger(year: number): void {
    this.selectedYear.set(year);
    this.loadEmployeeLedgers(this.selectedEmployeeId(), year);
  }

  selectLedgerMovements(ledger: LeaveLedgerResponse): void {
    this.selectedLedgerForMovements.set(ledger);
  }

  openRecordAdjustment(preselectedLeaveType?: string): void {
    this.adjustmentEmployeeId = this.selectedEmployeeId() || (this.allEmployees()[0]?.id ?? '');
    this.adjustmentLeaveTypeCode = preselectedLeaveType || 'PAID_ANNUAL';
    this.adjustmentYear = this.selectedYear();
    this.adjustmentAmount = 1;
    this.adjustmentType = 'HR_ADJUSTMENT_CREDIT';
    this.adjustmentNote = '';
    this.showAdjustmentModal.set(true);
  }

  saveAdjustment(): void {
    if (!this.adjustmentEmployeeId || !this.adjustmentLeaveTypeCode || !this.adjustmentAmount || this.adjustmentAmount <= 0) {
      this.errorMessage.set('Please provide a valid employee, leave type, and an amount greater than 0.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const req: LeaveAdjustmentRequest = {
      employeeId: this.adjustmentEmployeeId,
      leaveTypeCode: this.adjustmentLeaveTypeCode,
      year: Number(this.adjustmentYear),
      amount: Number(this.adjustmentAmount),
      type: this.adjustmentType,
      note: this.adjustmentNote?.trim() || undefined,
    };

    this.ledgerAdminService.adjustLedger(req).subscribe({
      next: (updatedLedger) => {
        this.saving.set(false);
        this.showAdjustmentModal.set(false);
        this.successMessage.set(
          `Adjustment of ${req.amount} day(s) (${this.formatMovementType(req.type)}) successfully recorded.`
        );
        if (this.selectedEmployeeId() === req.employeeId) {
          this.loadEmployeeLedgers(req.employeeId, this.selectedYear());
        } else {
          this.selectedEmployeeId.set(req.employeeId);
          this.loadEmployeeLedgers(req.employeeId, this.selectedYear());
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to record leave adjustment.');
      },
    });
  }

  formatMovementType(type: LedgerMovementType | string): string {
    switch (type) {
      case 'HR_ADJUSTMENT_CREDIT':
        return 'HR Credit (+)';
      case 'HR_ADJUSTMENT_DEBIT':
        return 'HR Debit (-)';
      case 'CORRECTION_CREDIT':
        return 'Correction (+)';
      case 'CORRECTION_DEBIT':
        return 'Correction (-)';
      case 'APPROVED_LEAVE_DEBIT':
        return 'Approved Leave Debit (-)';
      case 'CANCELLED_LEAVE_CREDIT':
        return 'Cancelled Leave Credit (+)';
      case 'MONTHLY_ACCRUAL':
        return 'Monthly Accrual (+)';
      case 'CARRY_OVER':
        return 'Carry Over (+)';
      default:
        return type;
    }
  }

  getMovementBadgeClass(type: LedgerMovementType | string): string {
    switch (type) {
      case 'HR_ADJUSTMENT_CREDIT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'HR_ADJUSTMENT_DEBIT':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'CORRECTION_CREDIT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CORRECTION_DEBIT':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'APPROVED_LEAVE_DEBIT':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CANCELLED_LEAVE_CREDIT':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'MONTHLY_ACCRUAL':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'CARRY_OVER':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }
}
