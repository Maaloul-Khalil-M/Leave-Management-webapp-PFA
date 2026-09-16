import { Component, input } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { BalanceCalculation } from '../../models';

@Component({
  selector: 'app-balance-calculation',
  standalone: true,
  imports: [MatExpansionModule, MatIconModule],
  templateUrl: './balance-calculation.component.html',
  styleUrl: './balance-calculation.component.scss'
})
export class BalanceCalculationComponent {
  readonly calculation = input<BalanceCalculation | null>(null);
}
