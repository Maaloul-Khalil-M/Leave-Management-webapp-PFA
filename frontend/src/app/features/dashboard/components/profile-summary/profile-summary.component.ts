import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { Profile } from '../../models';

@Component({
  selector: 'app-profile-summary',
  standalone: true,
  imports: [MatCardModule, MatChipsModule, MatIconModule],
  templateUrl: './profile-summary.component.html',
  styleUrl: './profile-summary.component.scss'
})
export class ProfileSummaryComponent {
  readonly profile = input<Profile | null>(null);
}
