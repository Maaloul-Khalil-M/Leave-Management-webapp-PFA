import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { DEPARTMENTS, STATUSES } from '../models/employee.model';
import { ImportDraft, ImportResult, ImportRow } from '../models/import-draft.model';
import { EmployeeImportService } from './employee-import.service';

type WizardStep = 'upload' | 'review' | 'success';

const PREVIEW_ROW_LIMIT = 20;

@Component({
  selector: 'app-employee-import',
  templateUrl: './employee-import.html',
  styleUrl: './employee-import.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeImport {
  private readonly importService = inject(EmployeeImportService);

  /** Emitted when the dialog should close without importing anything. */
  readonly closed = output<void>();
  /** Emitted once the (simulated) import has completed successfully. */
  readonly imported = output<ImportResult>();

  readonly step = signal<WizardStep>('upload');
  readonly isDragging = signal(false);
  readonly isParsing = signal(false);
  readonly isImporting = signal(false);
  readonly parseError = signal<string | null>(null);

  readonly draft = signal<ImportDraft | null>(null);
  readonly result = signal<ImportResult | null>(null);
  readonly showAllRows = signal(false);

  readonly departments = DEPARTMENTS;
  readonly statuses = STATUSES;
  readonly previewLimit = PREVIEW_ROW_LIMIT;

  // ---------- Step 1: Upload ----------

  onDownloadTemplate(): void {
    const csv = this.importService.buildTemplateCsv();
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
      this.parseError.set('Please upload a .csv file.');
      return;
    }

    this.isParsing.set(true);
    try {
      const parsed = await this.importService.parseCsv(file);
      if (!parsed.data || parsed.data.length === 0) {
        this.parseError.set('The CSV file appears to be empty.');
        return;
      }
      const draft = this.importService.buildImportDraft(file.name, parsed);
      this.draft.set(draft);
      this.showAllRows.set(false);
      this.step.set('review');
    } catch {
      this.parseError.set('We could not read that file. Please check the format and try again.');
    } finally {
      this.isParsing.set(false);
    }
  }

  // ---------- Step 2: Review (validation + preview + confirm) ----------

  get visibleRows(): ImportRow[] {
    const rows = this.draft()?.rows ?? [];
    return this.showAllRows() ? rows : rows.slice(0, PREVIEW_ROW_LIMIT);
  }

  get hiddenRowCount(): number {
    const total = this.draft()?.rows.length ?? 0;
    return this.showAllRows() ? 0 : Math.max(0, total - PREVIEW_ROW_LIMIT);
  }

  onShowAllRows(): void {
    this.showAllRows.set(true);
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
      const result = await this.importService.simulateImport(draft);
      this.result.set(result);
      this.step.set('success');
      this.imported.emit(result);
    } finally {
      this.isImporting.set(false);
    }
  }

  // ---------- Step 3: Success ----------

  onViewEmployees(): void {
    this.close();
  }

  onClose(): void {
    this.close();
  }

  private close(): void {
    this.closed.emit();
  }

  trackByRow(_index: number, row: ImportRow): number {
    return row.rowNumber;
  }
}
