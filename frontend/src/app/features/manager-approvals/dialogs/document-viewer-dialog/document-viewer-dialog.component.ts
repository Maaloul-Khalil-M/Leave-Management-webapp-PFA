import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LeaveRequestService } from '../../../../core/services/leave-request.service';

export interface DocumentViewerDialogData {
  documentId: string;
  employeeName?: string;
}

@Component({
  selector: 'app-document-viewer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="document-viewer-container">
      <div class="dialog-header">
        <div class="header-left">
          <mat-icon class="header-icon">attach_file</mat-icon>
          <div>
            <h2 mat-dialog-title class="dialog-title">Supporting Document</h2>
            <p class="dialog-subtitle">
              {{ data.employeeName ? 'Submitted by ' + data.employeeName : 'Document ID: ' + data.documentId }}
            </p>
          </div>
        </div>
        <div class="header-actions">
          @if (objectUrl()) {
            <a
              mat-icon-button
              [href]="objectUrl()!"
              target="_blank"
              title="Open in new window"
              class="action-icon"
            >
              <mat-icon>open_in_new</mat-icon>
            </a>
            <a
              mat-icon-button
              [href]="objectUrl()!"
              download="supporting-document"
              title="Download file"
              class="action-icon"
            >
              <mat-icon>download</mat-icon>
            </a>
          }
          <button mat-icon-button (click)="close()" class="action-icon" title="Close">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <mat-dialog-content class="dialog-content">
        @if (loading()) {
          <div class="state-container">
            <mat-spinner diameter="36"></mat-spinner>
            <p class="state-text">Fetching document...</p>
          </div>
        } @else if (error()) {
          <div class="state-container error">
            <mat-icon class="state-icon">error_outline</mat-icon>
            <p class="state-text">{{ error() }}</p>
          </div>
        } @else if (isImage()) {
          <div class="preview-wrap">
            <img [src]="objectUrl()!" alt="Document Preview" class="image-preview" />
          </div>
        } @else {
          <div class="preview-wrap iframe-wrap">
            <iframe [src]="safeUrl()!" class="document-iframe" title="PDF Document Viewer"></iframe>
          </div>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-flat-button (click)="close()">Close Preview</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .document-viewer-container {
      display: flex;
      flex-direction: column;
      width: 720px;
      max-width: 90vw;
      height: 600px;
      max-height: 85vh;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      border-bottom: 1px solid #e2e8f0;

      .header-left {
        display: flex;
        align-items: center;
        gap: 10px;

        .header-icon {
          color: #0284c7;
          font-size: 24px;
          width: 24px;
          height: 24px;
        }

        .dialog-title {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }

        .dialog-subtitle {
          margin: 0;
          font-size: 11px;
          color: #64748b;
        }
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 4px;

        .action-icon {
          color: #475569;
        }
      }
    }

    .dialog-content {
      flex: 1;
      padding: 12px !important;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
    }

    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px;

      .state-text {
        font-size: 13px;
        color: #64748b;
        margin: 0;
      }

      &.error {
        .state-icon {
          font-size: 36px;
          width: 36px;
          height: 36px;
          color: #dc2626;
        }

        .state-text {
          color: #dc2626;
          font-weight: 500;
        }
      }
    }

    .preview-wrap {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;

      .image-preview {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      &.iframe-wrap {
        height: 100%;

        .document-iframe {
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 6px;
          background: #ffffff;
        }
      }
    }

    .dialog-actions {
      padding: 10px 18px;
      border-top: 1px solid #e2e8f0;
      margin: 0;
    }
  `]
})
export class DocumentViewerDialogComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<DocumentViewerDialogComponent>);
  readonly data: DocumentViewerDialogData = inject(MAT_DIALOG_DATA);
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly objectUrl = signal<string | null>(null);
  readonly safeUrl = signal<SafeResourceUrl | null>(null);
  readonly isImage = signal(false);

  ngOnInit(): void {
    if (!this.data.documentId) {
      this.loading.set(false);
      this.error.set('No document identifier provided.');
      return;
    }

    this.leaveRequestService.downloadDocument(this.data.documentId).subscribe({
      next: (blob) => {
        const type = blob.type || '';
        this.isImage.set(type.startsWith('image/'));
        const url = URL.createObjectURL(blob);
        this.objectUrl.set(url);
        this.safeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load document preview. Please check network or file permissions.');
      },
    });
  }

  ngOnDestroy(): void {
    const url = this.objectUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
