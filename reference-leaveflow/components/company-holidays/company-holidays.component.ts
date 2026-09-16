import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { DatePipe } from '@angular/common';
import { Holiday } from '../../models';

@Component({
  selector: 'app-company-holidays',
  standalone: true,
  imports: [MatCardModule, DatePipe],
  templateUrl: './company-holidays.component.html',
  styleUrl: './company-holidays.component.scss'
})
export class CompanyHolidaysComponent {
  readonly items = input<Holiday[]>([]);
}
