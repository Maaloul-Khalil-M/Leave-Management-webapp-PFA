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

  readonly displayList = computed(() => {
    const all = [...this.items()];
    if (all.length === 0) return [];
    all.sort((a, b) => a.date.localeCompare(b.date));

    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = all.filter((h) => h.date >= todayStr);
    return upcoming.length > 0 ? upcoming : all;
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.displayList().length / this.pageSize)));

  readonly pagedItems = computed(() => {
    const list = this.displayList();
    const start = this.pageIndex() * this.pageSize;
    return list.slice(start, start + this.pageSize);
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
