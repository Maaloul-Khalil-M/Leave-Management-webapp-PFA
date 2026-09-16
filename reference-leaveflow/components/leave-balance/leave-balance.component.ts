import { Component, input, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { DecimalPipe } from '@angular/common';
import { LeaveBalance } from '../../models';

@Component({
  selector: 'app-leave-balance',
  standalone: true,
  imports: [MatCardModule, DecimalPipe],
  templateUrl: './leave-balance.component.html',
  styleUrl: './leave-balance.component.scss'
})
export class LeaveBalanceComponent {
  readonly balances = input<LeaveBalance[]>([]);

  readonly cards = computed(() =>
    this.balances().map((b) => ({
      ...b,
      progress: b.total > 0 ? (b.remaining / b.total) * 100 : 0,
      circumference: 2 * Math.PI * 36,
      dashOffset: (() => {
        const circ = 2 * Math.PI * 36;
        const pct = b.total > 0 ? b.remaining / b.total : 0;
        return circ * (1 - pct);
      })()
    }))
  );
}
