import { Injectable, inject } from '@angular/core';
import Papa from 'papaparse';
import {
  DEPARTMENTS,
  Employee,
  EMPLOYEE_CSV_COLUMNS,
  REQUIRED_EMPLOYEE_CSV_COLUMNS,
  STATUSES,
} from '../models/employee.model';
import { ImportDraft, ImportResult, ImportRow, RowError } from '../models/import-draft.model';
import { EmployeeService } from '../services/employee.service';
import { DepartmentService } from '../services/department.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Handles CSV parsing, validation (including uniqueness against existing
 * employees and within the file), draft creation and simulated import POST.
 */
@Injectable({ providedIn: 'root' })
export class EmployeeImportService {
  private readonly employeeService = inject(EmployeeService);
  private readonly departmentService = inject(DepartmentService);

  buildTemplateCsv(): string {
    const header = EMPLOYEE_CSV_COLUMNS.join(',');
    const sampleRows = [
      ['EMP101', 'Ava', 'Thompson', 'ava.thompson@example.com', '555-0101', 'Engineering', 'Frontend Engineer', '2024-03-18', 'active'],
      ['EMP102', 'Noah', 'Patel', 'noah.patel@example.com', '555-0102', 'Sales', 'Account Executive', '2023-11-02', 'active'],
      ['EMP103', 'Mia', 'Garcia', 'mia.garcia@example.com', '', 'Finance', 'Financial Analyst', '2022-06-30', 'inactive'],
    ];
    const lines = [header, ...sampleRows.map((row) => row.map((v) => this.csvEscape(v)).join(','))];
    return lines.join('\n');
  }

  private csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  parseCsv(file: File): Promise<Papa.ParseResult<Record<string, string>>> {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim(),
        complete: (results) => resolve(results),
        error: (error) => reject(error),
      });
    });
  }

  /**
   * Validates parsed CSV rows against required fields, formats, uniqueness
   * within the CSV, uniqueness against current frontend employee state,
   * and known departments / statuses / dates.
   */
  buildImportDraft(fileName: string, parsed: Papa.ParseResult<Record<string, string>>): ImportDraft {
    const fields = parsed.meta.fields ?? [];
    const missingColumns = REQUIRED_EMPLOYEE_CSV_COLUMNS.filter((col) => !fields.includes(col));

    const idFirstSeen = new Map<string, number>();
    const emailFirstSeen = new Map<string, number>();
    const phoneFirstSeen = new Map<string, number>();

    const existingDeptNames = new Set(
      this.departmentService.getAll().map((d) => d.name.toLowerCase())
    );

    const rows: ImportRow[] = parsed.data.map((raw, index) => {
      const rowNumber = index + 2; // header is row 1
      const errors: RowError[] = [];

      if (missingColumns.length > 0) {
        errors.push({
          field: 'columns',
          message: `Missing required column(s): ${missingColumns.join(', ')}`,
        });
      }

      const employeeId = (raw['employeeId'] ?? '').trim();
      const firstName = (raw['firstName'] ?? '').trim();
      const lastName = (raw['lastName'] ?? '').trim();
      const email = (raw['email'] ?? '').trim();
      const phone = (raw['phone'] ?? '').trim();
      const department = (raw['department'] ?? '').trim();
      const jobTitle = (raw['jobTitle'] ?? '').trim();
      const startDate = (raw['startDate'] ?? '').trim();
      const status = (raw['status'] ?? '').trim();

      // --- Employee ID ---
      if (!employeeId) {
        errors.push({ field: 'employeeId', message: 'Employee ID is required' });
      } else {
        const firstRow = idFirstSeen.get(employeeId);
        if (firstRow === undefined) {
          idFirstSeen.set(employeeId, rowNumber);
        } else {
          errors.push({
            field: 'employeeId',
            message: `This employee ID is duplicated in row ${firstRow}`,
          });
        }
        if (this.employeeService.existsEmployeeId(employeeId)) {
          errors.push({
            field: 'employeeId',
            message: 'This employee ID already belongs to another employee',
          });
        }
      }

      // --- Names ---
      if (!firstName) {
        errors.push({ field: 'firstName', message: 'First name is required' });
      }
      if (!lastName) {
        errors.push({ field: 'lastName', message: 'Last name is required' });
      }

      // --- Email ---
      if (!email) {
        errors.push({ field: 'email', message: 'Email is required' });
      } else if (!EMAIL_REGEX.test(email)) {
        errors.push({ field: 'email', message: 'Email is not valid' });
      } else {
        const key = email.toLowerCase();
        const firstRow = emailFirstSeen.get(key);
        if (firstRow === undefined) {
          emailFirstSeen.set(key, rowNumber);
        } else {
          errors.push({
            field: 'email',
            message: `This email is duplicated in row ${firstRow}`,
          });
        }
        if (this.employeeService.existsEmail(email)) {
          errors.push({
            field: 'email',
            message: 'This email already belongs to another employee',
          });
        }
      }

      // --- Phone (optional but unique when present) ---
      if (phone) {
        const normalized = this.employeeService.normalizePhone(phone);
        const firstRow = phoneFirstSeen.get(normalized);
        if (firstRow === undefined) {
          phoneFirstSeen.set(normalized, rowNumber);
        } else {
          errors.push({
            field: 'phone',
            message: `This phone number is duplicated in row ${firstRow}`,
          });
        }
        if (this.employeeService.existsPhone(phone)) {
          errors.push({
            field: 'phone',
            message: 'This phone number already belongs to another employee',
          });
        }
      }

      // --- Department ---
      if (!department) {
        errors.push({ field: 'department', message: 'Department is required' });
      } else if (!existingDeptNames.has(department.toLowerCase()) && !DEPARTMENTS.map((d) => d.toLowerCase()).includes(department.toLowerCase())) {
        errors.push({ field: 'department', message: `Unknown department "${department}"` });
      }

      // --- Job title ---
      if (!jobTitle) {
        errors.push({ field: 'jobTitle', message: 'Job title is required' });
      }

      // --- Start date ---
      if (!startDate) {
        errors.push({ field: 'startDate', message: 'Start date is required' });
      } else if (!this.isValidIsoDate(startDate)) {
        errors.push({ field: 'startDate', message: 'Start date must be a valid YYYY-MM-DD date' });
      }

      // --- Status ---
      if (!status) {
        errors.push({ field: 'status', message: 'Status is required' });
      } else if (!STATUSES.includes(status as Employee['status'])) {
        errors.push({
          field: 'status',
          message: 'Not a valid status (expected active or inactive)',
        });
      }

      const data: Employee = {
        employeeId,
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        department: department as Employee['department'],
        jobTitle,
        startDate,
        status: status as Employee['status'],
        managerId: null,
      };

      return {
        rowNumber,
        data,
        valid: errors.length === 0,
        errors,
      };
    });

    const validRows = rows.filter((r) => r.valid).length;

    return {
      id: this.generateId('draft'),
      status: 'draft',
      createdAt: new Date().toISOString(),
      fileName,
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      rows,
    };
  }

  private isValidIsoDate(value: string): boolean {
    if (!DATE_REGEX.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  /**
   * Simulates submitting the valid rows of the draft to the backend.
   */
  simulateImport(draft: ImportDraft): Promise<ImportResult> {
    const validEmployees = draft.rows.filter((r) => r.valid).map((r) => r.data);
    const batchId = this.generateId('IMP').toUpperCase();

    const payload = {
      importBatch: {
        id: batchId,
        fileName: draft.fileName,
        totalRows: draft.totalRows,
      },
      employees: validEmployees,
    };

    console.log('POST /hr/employees/import', payload);

    const result: ImportResult = {
      batchId,
      fileName: draft.fileName,
      totalRows: draft.totalRows,
      importedCount: validEmployees.length,
      skippedCount: draft.totalRows - validEmployees.length,
      importedEmployees: validEmployees,
    };

    return new Promise((resolve) => setTimeout(() => resolve(result), 700));
  }

  private generateId(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${random}`;
  }
}
