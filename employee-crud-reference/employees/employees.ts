import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsCoreOption } from 'echarts/core';
import { Employee } from '../models/employee.model';
import { ImportResult } from '../models/import-draft.model';
import { EmployeeImport } from '../employee-import/employee-import';
import { EmployeeService } from '../services/employee.service';
import { DepartmentService } from '../services/department.service';
import { PositionService } from '../services/position.service';
import { ContractService } from '../services/contract.service';

@Component({
  selector: 'app-employees',
  imports: [
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatSnackBarModule,
    MatCardModule,
    MatTooltipModule,
    MatDialogModule,
    NgxEchartsDirective,
    EmployeeImport,
  ],
  templateUrl: './employees.html',
  styleUrl: './employees.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Employees {
  private readonly employeeService = inject(EmployeeService);
  private readonly deptService = inject(DepartmentService);
  private readonly positionService = inject(PositionService);
  private readonly contractService = inject(ContractService);
  private readonly snack = inject(MatSnackBar);

  readonly employees = this.employeeService.employees;
  readonly departments = this.deptService.departments;
  readonly positions = this.positionService.positions;

  readonly search = signal('');
  readonly statusFilter = signal<string>('');
  readonly departmentFilter = signal<string>('');

  readonly isImportOpen = signal(false);
  readonly lastImportNotice = signal<string | null>(null);
  readonly newlyCreatedId = signal<string | null>(null);

  readonly displayedColumns = [
    'employeeId',
    'name',
    'email',
    'phone',
    'department',
    'jobTitle',
    'status',
    'actions',
  ];

  readonly filteredEmployees = computed(() => {
    const q = this.search().toLowerCase().trim();
    const status = this.statusFilter();
    const dept = this.departmentFilter();
    return this.employees().filter((e) => {
      if (status && e.status !== status) return false;
      if (dept && e.department !== dept) return false;
      if (!q) return true;
      const hay = `${e.employeeId} ${e.firstName} ${e.lastName} ${e.email} ${e.jobTitle}`.toLowerCase();
      return hay.includes(q);
    });
  });

  readonly deptChartOption = computed<EChartsCoreOption>(() => {
    const data = this.employeeService.byDepartment();
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 80, right: 24, top: 16, bottom: 24 },
      xAxis: { type: 'value', minInterval: 1 },
      yAxis: {
        type: 'category',
        data: data.map((d) => d.name),
        axisLabel: { width: 70, overflow: 'truncate' },
      },
      series: [
        {
          type: 'bar',
          data: data.map((d) => d.count),
          itemStyle: { color: '#4f46e5', borderRadius: [0, 4, 4, 0] },
          barWidth: 14,
        },
      ],
    };
  });

  readonly statusChartOption = computed<EChartsCoreOption>(() => {
    const data = this.employeeService.byStatus();
    return {
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          data: data.map((d) => ({ name: d.name, value: d.value })),
          label: { formatter: '{b}: {c}' },
        },
      ],
    };
  });

  readonly formOpen = signal(false);
  readonly formIsNew = signal(true);
  readonly formModel = signal<Partial<Employee>>({});

  readonly reassignOpen = signal(false);
  readonly reassignTarget = signal<Employee | null>(null);
  readonly reassignDept = signal('');
  readonly reassignPos = signal('');

  readonly managerOpen = signal(false);
  readonly managerTarget = signal<Employee | null>(null);
  readonly selectedManagerId = signal<string | null>(null);

  readonly contractsOpen = signal(false);
  readonly contractsEmployee = signal<Employee | null>(null);
  readonly contractsList = signal<ReturnType<ContractService['getByEmployee']>>([]);
  readonly contractFormOpen = signal(false);
  readonly contractForm = signal<Partial<{ type: string; startDate: string; endDate: string; status: string; id?: string }>>({});

  onOpenImport(): void {
    this.lastImportNotice.set(null);
    this.isImportOpen.set(true);
  }

  onImportClosed(): void {
    this.isImportOpen.set(false);
  }

  onImported(result: ImportResult): void {
    this.employeeService.addMany(result.importedEmployees);
    this.lastImportNotice.set(
      `Import completed — ${result.importedCount} employees imported successfully.` +
        (result.skippedCount > 0
          ? ` ${result.skippedCount} rows were skipped because they contained errors.`
          : '')
    );
    this.snack.open(
      `${result.importedCount} employees imported` +
        (result.skippedCount ? `, ${result.skippedCount} skipped` : ''),
      'OK',
      { duration: 4000 }
    );
    this.isImportOpen.set(false);
  }

  openNewEmployee(): void {
    this.formIsNew.set(true);
    this.formModel.set({
      employeeId: 'EMP' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: 'Engineering',
      jobTitle: '',
      startDate: new Date().toISOString().slice(0, 10),
      status: 'active',
      managerId: null,
    });
    this.formOpen.set(true);
  }

  openEdit(emp: Employee): void {
    this.formIsNew.set(false);
    this.formModel.set({ ...emp });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  saveEmployee(): void {
    const m = this.formModel();
    if (!m.firstName?.trim() || !m.lastName?.trim() || !m.email?.trim() || !m.employeeId) {
      this.snack.open('Please fill required fields', 'OK', { duration: 3000 });
      return;
    }
    if (this.formIsNew()) {
      if (this.employeeService.existsEmployeeId(m.employeeId!)) {
        this.snack.open('Employee ID already exists', 'OK', { duration: 3000 });
        return;
      }
      if (this.employeeService.existsEmail(m.email!)) {
        this.snack.open('Email already exists', 'OK', { duration: 3000 });
        return;
      }
      const emp: Employee = {
        employeeId: m.employeeId!,
        firstName: m.firstName!.trim(),
        lastName: m.lastName!.trim(),
        email: m.email!.trim(),
        phone: m.phone || undefined,
        department: m.department as Employee['department'],
        jobTitle: m.jobTitle || '',
        startDate: m.startDate || '',
        status: (m.status as Employee['status']) || 'active',
        managerId: null,
      };
      this.employeeService.create(emp);
      this.newlyCreatedId.set(emp.employeeId);
      this.snack.open('Employee created successfully', 'OK', { duration: 3000 });
    } else {
      const emp: Employee = {
        employeeId: m.employeeId!,
        firstName: m.firstName!.trim(),
        lastName: m.lastName!.trim(),
        email: m.email!.trim(),
        phone: m.phone || undefined,
        department: m.department as Employee['department'],
        jobTitle: m.jobTitle || '',
        startDate: m.startDate || '',
        status: (m.status as Employee['status']) || 'active',
        managerId: m.managerId ?? null,
      };
      this.employeeService.update(emp);
      this.snack.open('Employee updated', 'OK', { duration: 2500 });
    }
    this.closeForm();
  }

  createLogin(empId: string, email: string): void {
    this.employeeService.createLogin(empId, email);
    this.newlyCreatedId.set(null);
    this.snack.open('Login access created successfully', 'OK', { duration: 3000 });
  }

  confirmDelete(emp: Employee): void {
    if (confirm(`Delete employee ${emp.firstName} ${emp.lastName}? This action cannot be undone.`)) {
      this.employeeService.delete(emp.employeeId);
      this.snack.open('Employee deleted', 'OK', { duration: 2500 });
    }
  }

  openReassign(emp: Employee): void {
    this.reassignTarget.set(emp);
    this.reassignDept.set(emp.department);
    this.reassignPos.set(emp.jobTitle);
    this.reassignOpen.set(true);
  }

  confirmReassign(): void {
    const emp = this.reassignTarget();
    if (!emp) return;
    this.employeeService.reassign(
      emp.employeeId,
      this.reassignDept() as Employee['department'],
      this.reassignPos()
    );
    this.snack.open('Employee reassigned', 'OK', { duration: 2500 });
    this.reassignOpen.set(false);
  }

  openChangeManager(emp: Employee): void {
    this.managerTarget.set(emp);
    this.selectedManagerId.set(emp.managerId ?? null);
    this.managerOpen.set(true);
  }

  confirmChangeManager(): void {
    const emp = this.managerTarget();
    if (!emp) return;
    this.employeeService.changeManager(emp.employeeId, this.selectedManagerId());
    this.snack.open('Manager updated', 'OK', { duration: 2500 });
    this.managerOpen.set(false);
  }

  openContracts(emp: Employee): void {
    this.contractsEmployee.set(emp);
    this.contractsList.set(this.contractService.getByEmployee(emp.employeeId));
    this.contractsOpen.set(true);
    this.contractFormOpen.set(false);
  }

  openNewContract(): void {
    this.contractForm.set({
      type: 'permanent',
      startDate: new Date().toISOString().slice(0, 10),
      status: 'active',
    });
    this.contractFormOpen.set(true);
  }

  saveContract(): void {
    const emp = this.contractsEmployee();
    const f = this.contractForm();
    if (!emp || !f.type || !f.startDate) return;
    if (f.id) {
      this.contractService.update({
        id: f.id,
        employeeId: emp.employeeId,
        type: f.type as any,
        startDate: f.startDate,
        endDate: f.endDate,
        status: f.status as any,
      });
    } else {
      this.contractService.create({
        id: this.contractService.generateId(),
        employeeId: emp.employeeId,
        type: f.type as any,
        startDate: f.startDate,
        endDate: f.endDate,
        status: (f.status as any) || 'active',
      });
    }
    this.contractsList.set(this.contractService.getByEmployee(emp.employeeId));
    this.contractFormOpen.set(false);
    this.snack.open('Contract saved', 'OK', { duration: 2500 });
  }

  managerName(id: string | null | undefined): string {
    if (!id) return '—';
    const m = this.employeeService.getById(id);
    return m ? `${m.firstName} ${m.lastName}` : id;
  }

  trackById(_i: number, e: Employee): string {
    return e.employeeId;
  }
}
