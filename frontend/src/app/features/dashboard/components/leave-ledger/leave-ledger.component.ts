import { Component, input, viewChild, effect, AfterViewInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe, DecimalPipe } from '@angular/common';
import { LeaveLedgerEntry } from '../../models';

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
    DecimalPipe
  ],
  templateUrl: './leave-ledger.component.html',
  styleUrl: './leave-ledger.component.scss'
})
export class LeaveLedgerComponent implements AfterViewInit {
  readonly items = input<LeaveLedgerEntry[]>([]);

  readonly displayedColumns = ['date', 'leaveType', 'days', 'reason', 'status', 'balance'];
  dataSource = new MatTableDataSource<LeaveLedgerEntry>([]);

  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);

  constructor() {
    effect(() => {
      this.dataSource.data = this.items();
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
