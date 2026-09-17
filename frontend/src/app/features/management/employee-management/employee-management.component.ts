import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { HeaderComponent } from '../../../core/layout/header/header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge';

@Component({
  selector: 'app-employee-management',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, StatusBadgeComponent, EmployeeImportDialogComponent],
  templateUrl: './employee-management.component.html',
  styleUrl: './employee-management.component.scss',
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
        ? `${currAssignment.departmentLabel} â€” ${currAssignment.positionLabel}`
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

