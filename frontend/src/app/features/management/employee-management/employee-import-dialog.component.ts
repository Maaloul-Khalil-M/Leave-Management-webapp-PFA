import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  EmployeeCsvService,
  ImportDraft,
  ImportResult,
  ImportRow,
} from './csv/employee-csv.service';
import { EmployeeResponse } from '../../../core/services/employee-admin.service';
import {
  DepartmentResponse,
  PositionResponse,
} from '../../../core/services/organization.service';

type WizardStep = 'upload' | 'review' | 'success';
const PREVIEW_LIMIT = 20;

@Component({
  selector: 'app-employee-import-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
      <div class="w-full max-w-4xl rounded-2xl bg-white shadow-2xl my-8 overflow-hidden">
        <!-- Header -->
        <header class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Import Workforce & Employees</h2>
            <p class="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              <span [ngClass]="step() === 'upload' ? 'font-bold text-indigo-950' : 'text-slate-400'">1. Upload</span>
              <span class="text-slate-300">›</span>
              <span [ngClass]="step() === 'review' ? 'font-bold text-indigo-950' : 'text-slate-400'">2. Review</span>
              <span class="text-slate-300">›</span>
              <span [ngClass]="step() === 'success' ? 'font-bold text-indigo-950' : 'text-slate-400'">3. Done</span>
            </p>
          </div>
          <button
            type="button"
            (click)="onClose()"
            [disabled]="isImporting()"
            class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            &times;
          </button>
        </header>

        <div class="p-6">
          <!-- ===================== STEP 1: UPLOAD ===================== -->
          @if (step() === 'upload') {
            <section class="space-y-4">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
                <div>
                  <h4 class="text-xs font-semibold text-slate-800">Need the standard spreadsheet format?</h4>
                  <p class="text-xs text-slate-500">Download the pre-configured CSV template with required column headers and sample entries.</p>
                </div>
                <button
                  type="button"
                  (click)="downloadTemplate()"
                  class="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Download Template
                </button>
              </div>

              <!-- Dropzone -->
              <div
                class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition cursor-pointer"
                [ngClass]="isDragging() ? 'border-indigo-950 bg-indigo-50/50' : 'border-slate-200 bg-slate-50/25 hover:border-slate-300'"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
              >
                @if (isParsing()) {
                  <div class="py-6 text-center">
                    <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-950 border-r-transparent"></div>
                    <p class="mt-3 text-xs font-medium text-slate-600">Reading and validating your file…</p>
                  </div>
                } @else {
                  <div class="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-950 mb-3">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p class="text-sm font-semibold text-slate-900">Drag and drop your CSV file here</p>
                  <p class="text-xs text-slate-400 mt-1">or</p>
                  <label class="mt-3 inline-flex cursor-pointer items-center justify-center rounded-lg bg-indigo-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900">
                    Choose CSV file
                    <input
                      type="file"
                      accept=".csv"
                      class="hidden"
                      (change)="onFileInputChange($event)"
                    />
                  </label>
                }
              </div>

              @if (parseError()) {
                <div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  {{ parseError() }}
                </div>
              }
            </section>
          }

          <!-- ===================== STEP 2: REVIEW ===================== -->
          @if (step() === 'review' && draft(); as d) {
            <section class="space-y-4">
              <!-- Summary Card -->
              <div
                class="rounded-xl border p-4 shadow-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                [ngClass]="d.invalidRows === 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'"
              >
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-slate-700">Import Validation</p>
                  <p class="text-sm font-bold text-slate-900 mt-0.5">
                    {{ d.totalRows }} row{{ d.totalRows === 1 ? '' : 's' }} analyzed from <span class="font-mono">{{ d.fileName }}</span>
                  </p>
                </div>
                <div class="flex items-center gap-3 text-xs font-semibold">
                  <span class="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                    ✓ {{ d.validRows }} valid
                  </span>
                  <span
                    class="rounded-full px-3 py-1"
                    [ngClass]="d.invalidRows > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'"
                  >
                    ✕ {{ d.invalidRows }} error{{ d.invalidRows === 1 ? '' : 's' }}
                  </span>
                </div>
              </div>

              <!-- Preview Table -->
              <div class="max-h-96 overflow-auto rounded-xl border border-slate-200">
                <table class="w-full text-left text-xs">
                  <thead class="sticky top-0 border-b border-slate-200 bg-slate-50 uppercase text-slate-500">
                    <tr>
                      <th class="px-3 py-2.5">Row</th>
                      <th class="px-3 py-2.5">Employee #</th>
                      <th class="px-3 py-2.5">Name</th>
                      <th class="px-3 py-2.5">Email</th>
                      <th class="px-3 py-2.5">Department</th>
                      <th class="px-3 py-2.5">Position</th>
                      <th class="px-3 py-2.5">Status</th>
                      <th class="px-3 py-2.5">Validation</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (row of visibleRows; track row.rowNumber) {
                      <tr [ngClass]="row.valid ? 'hover:bg-slate-50/50' : 'bg-rose-50/30 hover:bg-rose-50/50'">
                        <td class="px-3 py-2 font-mono text-slate-400">{{ row.rowNumber }}</td>
                        <td class="px-3 py-2 font-semibold text-slate-800">{{ row.raw['employeeNumber'] || '—' }}</td>
                        <td class="px-3 py-2 text-slate-900 font-medium">
                          {{ row.raw['firstName'] }} {{ row.raw['lastName'] }}
                        </td>
                        <td class="px-3 py-2 text-slate-600">{{ row.raw['email'] || '—' }}</td>
                        <td class="px-3 py-2 text-slate-700">{{ row.raw['department'] || '—' }}</td>
                        <td class="px-3 py-2 text-slate-700">{{ row.raw['position'] || '—' }}</td>
                        <td class="px-3 py-2">
                          <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                            {{ row.raw['status'] || 'ACTIVE' }}
                          </span>
                        </td>
                        <td class="px-3 py-2">
                          @if (row.valid) {
                            <span class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                              ✓ Valid
                            </span>
                          } @else {
                            <span class="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800 mb-1">
                              ✕ Invalid
                            </span>
                            <ul class="space-y-0.5 text-[11px] text-rose-700">
                              @for (err of row.errors; track err.field) {
                                <li>• {{ err.message }}</li>
                              }
                            </ul>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (hiddenRowCount > 0) {
                <div class="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Showing first {{ previewLimit }} of {{ d.totalRows }} rows.</span>
                  <button
                    type="button"
                    (click)="showAllRows.set(true)"
                    class="font-semibold text-indigo-950 hover:underline"
                  >
                    Show all {{ d.totalRows }} rows
                  </button>
                </div>
              }

              <!-- Actions Panel -->
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  (click)="onChooseDifferentFile()"
                  [disabled]="isImporting()"
                  class="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Choose a different file
                </button>

                <button
                  type="button"
                  (click)="onConfirmImport()"
                  [disabled]="d.validRows === 0 || isImporting()"
                  class="rounded-lg bg-indigo-950 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900 disabled:opacity-50"
                >
                  @if (isImporting()) {
                    Importing {{ d.validRows }} employees…
                  } @else {
                    Import {{ d.validRows }} Employee{{ d.validRows === 1 ? '' : 's' }}
                  }
                </button>
              </div>
            </section>
          }

          <!-- ===================== STEP 3: SUCCESS ===================== -->
          @if (step() === 'success' && result(); as r) {
            <section class="py-6 text-center space-y-4">
              <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div>
                <h3 class="text-lg font-bold text-slate-900">Import Completed</h3>
                <p class="text-xs text-slate-500 mt-1">
                  {{ r.importedCount }} employee{{ r.importedCount === 1 ? '' : 's' }} successfully added to the workforce database.
                </p>
              </div>

              <div class="mx-auto max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p class="text-slate-400">Processed</p>
                    <p class="text-base font-bold text-slate-900">{{ r.totalRows }}</p>
                  </div>
                  <div>
                    <p class="text-emerald-600">Imported</p>
                    <p class="text-base font-bold text-emerald-600">{{ r.importedCount }}</p>
                  </div>
                  <div>
                    <p class="text-rose-600">Skipped</p>
                    <p class="text-base font-bold text-rose-600">{{ r.skippedCount + r.failedCount }}</p>
                  </div>
                </div>
              </div>

              @if (r.errors.length > 0) {
                <div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-left text-xs text-rose-800 max-h-40 overflow-y-auto">
                  <p class="font-bold mb-1">Errors encountered during creation:</p>
                  <ul class="space-y-1">
                    @for (err of r.errors; track err.rowNumber) {
                      <li>• Row {{ err.rowNumber }} ({{ err.employeeNumber }}): {{ err.message }}</li>
                    }
                  </ul>
                </div>
              }

              <div class="flex justify-center gap-3 pt-4">
                <button
                  type="button"
                  (click)="onClose()"
                  class="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  (click)="onViewEmployees()"
                  class="rounded-lg bg-indigo-950 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-900"
                >
                  View Employees Directory
                </button>
              </div>
            </section>
          }
        </div>
      </div>
    </div>
  `,
})
export class EmployeeImportDialogComponent {
  private readonly csvService = inject(EmployeeCsvService);

  readonly existingEmployees = input<EmployeeResponse[]>([]);
  readonly departments = input<DepartmentResponse[]>([]);
  readonly positions = input<PositionResponse[]>([]);

  readonly close = output<void>();
  readonly imported = output<ImportResult>();

  readonly step = signal<WizardStep>('upload');
  readonly isDragging = signal(false);
  readonly isParsing = signal(false);
  readonly isImporting = signal(false);
  readonly parseError = signal<string | null>(null);

  readonly draft = signal<ImportDraft | null>(null);
  readonly result = signal<ImportResult | null>(null);
  readonly showAllRows = signal(false);
  readonly previewLimit = PREVIEW_LIMIT;

  downloadTemplate(): void {
    const csv = this.csvService.buildTemplateCsv(this.departments(), this.positions());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employee-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.handleFile(file);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.handleFile(file);
    }
    input.value = '';
  }

  private async handleFile(file: File): Promise<void> {
    this.parseError.set(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.parseError.set('Please upload a valid .csv file.');
      return;
    }

    this.isParsing.set(true);
    try {
      const draft = await this.csvService.parseAndValidate(
        file,
        this.existingEmployees(),
        this.departments(),
        this.positions()
      );

      if (draft.totalRows === 0) {
        this.parseError.set('The CSV file appears to be empty or has no data rows.');
        return;
      }

      this.draft.set(draft);
      this.showAllRows.set(false);
      this.step.set('review');
    } catch {
      this.parseError.set('Unable to read or parse the CSV file. Please verify the format.');
    } finally {
      this.isParsing.set(false);
    }
  }

  get visibleRows(): ImportRow[] {
    const rows = this.draft()?.rows ?? [];
    return this.showAllRows() ? rows : rows.slice(0, PREVIEW_LIMIT);
  }

  get hiddenRowCount(): number {
    const total = this.draft()?.rows.length ?? 0;
    return this.showAllRows() ? 0 : Math.max(0, total - PREVIEW_LIMIT);
  }

  onChooseDifferentFile(): void {
    this.draft.set(null);
    this.parseError.set(null);
    this.step.set('upload');
  }

  async onConfirmImport(): Promise<void> {
    const draft = this.draft();
    if (!draft || draft.validRows === 0) return;

    this.isImporting.set(true);
    try {
      const res = await this.csvService.executeImport(draft);
      this.result.set(res);
      this.step.set('success');
      this.imported.emit(res);
    } finally {
      this.isImporting.set(false);
    }
  }

  onViewEmployees(): void {
    this.onClose();
  }

  onClose(): void {
    this.close.emit();
  }
}
