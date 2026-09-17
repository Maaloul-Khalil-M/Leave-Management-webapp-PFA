import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  EmployeeAdminService,
  EmployeeResponse,
  CreateEmployeeRequest,
  EmploymentStatus,
} from '../../../../core/services/employee-admin.service';
import {
  DepartmentResponse,
  PositionResponse,
} from '../../../../core/services/organization.service';
import { buildCsv, parseCsv } from './csv-parser';

export const CSV_COLUMNS = [
  'employeeNumber',
  'firstName',
  'lastName',
  'email',
  'phone',
  'gender',
  'birthDate',
  'hireDate',
  'department',
  'position',
  'status',
  'managerEmployeeNumber',
] as const;

export const REQUIRED_CSV_COLUMNS = [
  'employeeNumber',
  'firstName',
  'lastName',
  'email',
  'department',
  'position',
] as const;

export interface RowError {
  field: string;
  message: string;
}

export interface ImportRow {
  rowNumber: number;
  raw: Record<string, string>;
  request: CreateEmployeeRequest | null;
  valid: boolean;
  errors: RowError[];
}

export interface ImportDraft {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ImportRow[];
}

export interface ImportResult {
  fileName: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: { rowNumber: number; employeeNumber: string; message: string }[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

@Injectable({ providedIn: 'root' })
export class EmployeeCsvService {
  private readonly empService = inject(EmployeeAdminService);

  /**
   * Generates a template CSV string populated with actual system departments/positions.
   */
  buildTemplateCsv(
    departments: DepartmentResponse[],
    positions: PositionResponse[]
  ): string {
    const dept1 = departments[0]?.label || 'Engineering';
    const dept2 = departments[1]?.label || 'Human Resources';
    const pos1 = positions.find((p) => p.departmentId === departments[0]?.id)?.title || positions[0]?.title || 'Software Engineer';
    const pos2 = positions.find((p) => p.departmentId === departments[1]?.id)?.title || positions[1]?.title || 'HR Specialist';

    const sampleRows = [
      [
        'EMP-101',
        'Ava',
        'Thompson',
        'ava.thompson@example.com',
        '+216 55 101 202',
        'FEMALE',
        '1992-04-15',
        new Date().toISOString().substring(0, 10),
        dept1,
        pos1,
        'ACTIVE',
        '',
      ],
      [
        'EMP-102',
        'Noah',
        'Patel',
        'noah.patel@example.com',
        '+216 55 202 303',
        'MALE',
        '1989-11-20',
        new Date().toISOString().substring(0, 10),
        dept2,
        pos2,
        'ACTIVE',
        'EMP-101',
      ],
    ];

    return buildCsv([...CSV_COLUMNS], sampleRows);
  }

  /**
   * Serializes a list of employees into an RFC 4180 CSV string.
   */
  exportEmployeesCsv(employees: EmployeeResponse[]): string {
    const rows = employees.map((emp) => [
      emp.employeeNumber || '',
      emp.profile?.firstName || '',
      emp.profile?.lastName || '',
      emp.profile?.email || '',
      emp.profile?.phone || '',
      emp.profile?.gender || '',
      emp.profile?.birthDate || '',
      emp.profile?.hireDate || '',
      emp.currentAssignment?.departmentLabel || '',
      emp.currentAssignment?.positionLabel || '',
      emp.employmentStatus || 'ACTIVE',
      emp.currentManager?.name || '',
    ]);

    return buildCsv([...CSV_COLUMNS], rows);
  }

  /**
   * Parses and validates a CSV file against current master data and existing employees.
   */
  async parseAndValidate(
    file: File,
    existingEmployees: EmployeeResponse[],
    departments: DepartmentResponse[],
    positions: PositionResponse[]
  ): Promise<ImportDraft> {
    const text = await file.text();
    const parsed = parseCsv(text);

    const headers = parsed.headers.map((h) => h.toLowerCase());
    const missingColumns = REQUIRED_CSV_COLUMNS.filter(
      (req) => !headers.includes(req.toLowerCase())
    );

    const seenNumbers = new Map<string, number>();
    const seenEmails = new Map<string, number>();

    const existingNumSet = new Set(
      existingEmployees.map((e) => (e.employeeNumber || '').toLowerCase().trim())
    );
    const existingEmailSet = new Set(
      existingEmployees.map((e) => (e.profile?.email || '').toLowerCase().trim())
    );

    const rows: ImportRow[] = [];

    for (let i = 0; i < parsed.rows.length; i++) {
      const raw = parsed.rows[i];
      const rowNumber = i + 2; // header is row 1
      const errors: RowError[] = [];

      if (missingColumns.length > 0) {
        errors.push({
          field: 'columns',
          message: `Missing required column(s): ${missingColumns.join(', ')}`,
        });
      }

      const employeeNumber = this.getField(raw, 'employeeNumber');
      const firstName = this.getField(raw, 'firstName');
      const lastName = this.getField(raw, 'lastName');
      const email = this.getField(raw, 'email');
      const phone = this.getField(raw, 'phone');
      const gender = this.getField(raw, 'gender').toUpperCase();
      const birthDate = this.getField(raw, 'birthDate');
      const hireDate = this.getField(raw, 'hireDate') || new Date().toISOString().substring(0, 10);
      const departmentName = this.getField(raw, 'department');
      const positionName = this.getField(raw, 'position');
      const statusRaw = this.getField(raw, 'status').toUpperCase() || 'ACTIVE';
      const managerRefNum = this.getField(raw, 'managerEmployeeNumber');

      // 1. Employee Number Validation
      if (!employeeNumber) {
        errors.push({ field: 'employeeNumber', message: 'Employee number is required' });
      } else {
        const lowerNum = employeeNumber.toLowerCase();
        const firstSeen = seenNumbers.get(lowerNum);
        if (firstSeen !== undefined) {
          errors.push({
            field: 'employeeNumber',
            message: `Duplicate employee number (first seen on row ${firstSeen})`,
          });
        } else {
          seenNumbers.set(lowerNum, rowNumber);
        }

        if (existingNumSet.has(lowerNum)) {
          errors.push({
            field: 'employeeNumber',
            message: `Employee number "${employeeNumber}" already exists in the database`,
          });
        }
      }

      // 2. Name Validation
      if (!firstName) {
        errors.push({ field: 'firstName', message: 'First name is required' });
      } else if (firstName.length > 100) {
        errors.push({ field: 'firstName', message: 'First name must not exceed 100 characters' });
      }

      if (!lastName) {
        errors.push({ field: 'lastName', message: 'Last name is required' });
      } else if (lastName.length > 100) {
        errors.push({ field: 'lastName', message: 'Last name must not exceed 100 characters' });
      }

      // 3. Email Validation
      if (!email) {
        errors.push({ field: 'email', message: 'Email address is required' });
      } else if (!EMAIL_REGEX.test(email)) {
        errors.push({ field: 'email', message: 'Invalid email address format' });
      } else {
        const lowerEmail = email.toLowerCase();
        const firstSeen = seenEmails.get(lowerEmail);
        if (firstSeen !== undefined) {
          errors.push({
            field: 'email',
            message: `Duplicate email address (first seen on row ${firstSeen})`,
          });
        } else {
          seenEmails.set(lowerEmail, rowNumber);
        }

        if (existingEmailSet.has(lowerEmail)) {
          errors.push({
            field: 'email',
            message: `Email "${email}" already exists in the database`,
          });
        }
      }

      // 4. Dates Validation
      if (birthDate && !DATE_REGEX.test(birthDate)) {
        errors.push({ field: 'birthDate', message: 'Birth date must be in YYYY-MM-DD format' });
      }

      if (hireDate && !DATE_REGEX.test(hireDate)) {
        errors.push({ field: 'hireDate', message: 'Hire date must be in YYYY-MM-DD format' });
      }

      // 5. Department Resolution
      const matchedDept = departments.find(
        (d) => d.label.toLowerCase() === departmentName.toLowerCase()
      );
      if (!departmentName) {
        errors.push({ field: 'department', message: 'Department is required' });
      } else if (!matchedDept) {
        errors.push({
          field: 'department',
          message: `Unknown department "${departmentName}". Available: ${departments.map((d) => d.label).join(', ')}`,
        });
      }

      // 6. Position Resolution
      const matchedPos = positions.find(
        (p) =>
          p.title.toLowerCase() === positionName.toLowerCase() &&
          (!matchedDept || !p.departmentId || p.departmentId === matchedDept.id)
      ) || positions.find((p) => p.title.toLowerCase() === positionName.toLowerCase());

      if (!positionName) {
        errors.push({ field: 'position', message: 'Position title is required' });
      } else if (!matchedPos) {
        errors.push({
          field: 'position',
          message: `Unknown position "${positionName}"`,
        });
      }

      // 7. Status Validation
      const validStatuses: EmploymentStatus[] = ['ACTIVE', 'SUSPENDED', 'TERMINATED'];
      let employmentStatus: EmploymentStatus = 'ACTIVE';
      if (statusRaw) {
        if (!validStatuses.includes(statusRaw as EmploymentStatus)) {
          errors.push({
            field: 'status',
            message: `Invalid status "${statusRaw}". Expected ACTIVE, SUSPENDED, or TERMINATED`,
          });
        } else {
          employmentStatus = statusRaw as EmploymentStatus;
        }
      }

      // 8. Manager Resolution
      let managerEmployeeId: string | undefined = undefined;
      if (managerRefNum) {
        const foundManager = existingEmployees.find(
          (e) => (e.employeeNumber || '').toLowerCase() === managerRefNum.toLowerCase()
        );
        if (foundManager) {
          managerEmployeeId = foundManager.id;
        } else {
          errors.push({
            field: 'managerEmployeeNumber',
            message: `Referenced manager "${managerRefNum}" not found in current employees`,
          });
        }
      }

      let request: CreateEmployeeRequest | null = null;
      if (errors.length === 0 && matchedDept && matchedPos) {
        request = {
          employeeNumber,
          employmentStatus,
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          gender: gender || undefined,
          birthDate: birthDate || undefined,
          hireDate: hireDate || undefined,
          initialAssignment: {
            departmentId: matchedDept.id,
            departmentLabel: matchedDept.label,
            positionId: matchedPos.id,
            positionLabel: matchedPos.title,
            startDate: hireDate,
          },
          managerEmployeeId,
        };
      }

      rows.push({
        rowNumber,
        raw,
        request,
        valid: errors.length === 0,
        errors,
      });
    }

    const validRows = rows.filter((r) => r.valid).length;

    return {
      fileName: file.name,
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      rows,
    };
  }

  /**
   * Sequentially submits valid employee records to the real backend.
   */
  async executeImport(draft: ImportDraft): Promise<ImportResult> {
    const validRows = draft.rows.filter((r) => r.valid && r.request !== null);
    let importedCount = 0;
    let failedCount = 0;
    const errors: { rowNumber: number; employeeNumber: string; message: string }[] = [];

    for (const row of validRows) {
      if (!row.request) continue;
      try {
        await firstValueFrom(this.empService.createEmployee(row.request));
        importedCount++;
      } catch (err: any) {
        failedCount++;
        const msg =
          err?.error?.message ||
          err?.error?.error?.message ||
          'Server rejected employee creation';
        errors.push({
          rowNumber: row.rowNumber,
          employeeNumber: row.request.employeeNumber,
          message: msg,
        });
      }
    }

    return {
      fileName: draft.fileName,
      totalRows: draft.totalRows,
      importedCount,
      skippedCount: draft.invalidRows,
      failedCount,
      errors,
    };
  }

  private getField(raw: Record<string, string>, name: string): string {
    const key = Object.keys(raw).find((k) => k.toLowerCase().trim() === name.toLowerCase());
    return key ? (raw[key] ?? '').trim() : '';
  }
}
