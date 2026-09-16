import { Component, input, signal, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { Holiday } from '../../models';

@Component({
  selector: 'app-company-holidays',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, DatePipe],
  templateUrl: './company-holidays.component.html',
  styleUrl: './company-holidays.component.scss'
})
export class CompanyHolidaysComponent {
  readonly items = input<Holiday[]>([]);
  readonly pageIndex = signal(0);
  readonly pageSize = 3;

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.items().length / this.pageSize)));

  readonly pagedItems = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.items().slice(start, start + this.pageSize);
  });

  prevPage(): void {
    if (this.pageIndex() > 0) {
      this.pageIndex.update((p) => p - 1);
    }
  }

  nextPage(): void {
    if (this.pageIndex() < this.totalPages() - 1) {
      this.pageIndex.update((p) => p + 1);
    }
  }
}
