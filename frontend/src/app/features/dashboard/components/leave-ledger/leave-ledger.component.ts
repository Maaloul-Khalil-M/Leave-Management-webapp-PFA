import { Component, input, viewChild, effect, computed, AfterViewInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe, DecimalPipe } from '@angular/common';
import { LeaveLedgerEntry } from '../../models';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-leave-ledger',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    DatePipe,
    DecimalPipe,
    StatusBadgeComponent
  ],
  templateUrl: './leave-ledger.component.html',
  styleUrl: './leave-ledger.component.scss'
})
export class LeaveLedgerComponent implements AfterViewInit {
  readonly items = input<LeaveLedgerEntry[]>([]);

  readonly displayedColumns = ['date', 'days', 'reason', 'status', 'balance'];
  dataSource = new MatTableDataSource<LeaveLedgerEntry>([]);

  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);

  readonly computedItems = computed<LeaveLedgerEntry[]>(() => {
    const raw = this.items();
    if (!raw || raw.length === 0) return [];

    // Sort newest first to unwind backward from the current final balance
    const entries = [...raw].sort((a, b) => b.date.localeCompare(a.date));
    let running = entries[0]?.balance ?? 0;
    for (let i = 0; i < entries.length; i++) {
      if (i === 0) {
        entries[i].balance = running;
      } else {
        // balance before was current running minus the movement amount of the row after it
        running = running - entries[i - 1].days;
        entries[i].balance = Math.round(running * 10) / 10;
      }
    }

    return entries;
  });

  constructor() {
    effect(() => {
      this.dataSource.data = this.computedItems();
    });
  }

  ngAfterViewInit(): void {
    const pag = this.paginator();
    const srt = this.sort();
    if (pag) {
      this.dataSource.paginator = pag;
    }
    if (srt) {
      this.dataSource.sort = srt;
    }
  }
}
