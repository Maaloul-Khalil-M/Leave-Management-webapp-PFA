import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StatusBadgeComponent } from '../../../../../shared/ui/status-badge/status-badge.component';

export interface CalendarEventDialogData {
  title: string;
  type: string;
  status?: string;
  startDate: string;
  endDate?: string;
  days?: number;
  reason?: string;
  color?: string;
}

@Component({
  selector: 'app-event-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    StatusBadgeComponent
  ],
  templateUrl: './event-detail-dialog.component.html',
  styleUrl: './event-detail-dialog.component.scss'
})
export class EventDetailDialogComponent {
  readonly dialogRef = inject(MatDialogRef<EventDetailDialogComponent>);
  readonly data: CalendarEventDialogData = inject(MAT_DIALOG_DATA);

  close(): void {
    this.dialogRef.close();
  }
}
