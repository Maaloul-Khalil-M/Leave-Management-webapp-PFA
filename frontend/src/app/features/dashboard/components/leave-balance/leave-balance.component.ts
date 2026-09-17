import { Component, input, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DecimalPipe } from '@angular/common';
import { LeaveBalance, BalanceCalculation } from '../../models';

@Component({
  selector: 'app-leave-balance',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    DecimalPipe
  ],
  templateUrl: './leave-balance.component.html',
  styleUrl: './leave-balance.component.scss'
})
export class LeaveBalanceComponent {
  readonly balances = input<LeaveBalance[]>([]);
  readonly accrualRate = input<string | undefined>();
  readonly fiscalPeriod = input<string | undefined>();
  readonly calculation = input<BalanceCalculation | null>(null);

  readonly annualBalance = computed(() => {
    const list = this.balances();
    const annual = list.find((b) => b.code === 'PAID_ANNUAL') || list[0];
    if (!annual) return null;
    const circ = 2 * Math.PI * 28;
    const pct = annual.total > 0 ? annual.remaining / annual.total : 0;
    return {
      ...annual,
      progress: pct * 100,
      circumference: circ,
      dashOffset: circ * (1 - pct)
    };
  });

  readonly otherBalances = computed(() =>
    this.balances()
      .filter((b) => b.code !== 'PAID_ANNUAL')
      .map((b) => ({
        ...b,
        icon: this.getIcon(b.code),
        policyNote: this.getPolicyNote(b.code)
      }))
  );

  private getIcon(code: string): string {
    switch (code) {
      case 'SICK':
        return 'medical_services';
      case 'UNPAID':
        return 'event_busy';
      case 'MATERNITY':
        return 'child_friendly';
      default:
        return 'date_range';
    }
  }

  private getPolicyNote(code: string): string {
    switch (code) {
      case 'SICK':
        return 'Medical proof required';
      case 'UNPAID':
        return 'Discretionary approval';
      case 'MATERNITY':
        return 'Statutory entitlement';
      default:
        return 'Standard policy';
    }
  }
}
