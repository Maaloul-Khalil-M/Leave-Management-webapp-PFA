import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type StatusCategory =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'draft'
  | 'cancelled'
  | 'active'
  | 'suspended'
  | 'terminated'
  | 'holiday'
  | 'neutral';

export function getStatusCategory(status: string): StatusCategory {
  const raw = (status || '').trim().toUpperCase();
  switch (raw) {
    case 'APPROVED':
    case 'ACTIVE':
      return raw === 'ACTIVE' ? 'active' : 'approved';

    case 'PENDING':
    case 'SUBMITTED':
    case 'SUSPENDED':
    case 'SPECIAL_WORKING_DAY':
      return raw === 'SUSPENDED' ? 'suspended' : 'pending';

    case 'REJECTED':
    case 'TERMINATED':
      return raw === 'TERMINATED' ? 'terminated' : 'rejected';

    case 'DRAFT':
      return 'draft';

    case 'CANCELLED':
    case 'CANCELED':
      return 'cancelled';

    case 'PUBLIC_HOLIDAY':
    case 'SPECIAL_NON_WORKING_DAY':
      return 'holiday';

    default:
      return 'neutral';
  }
}

export function formatStatusLabel(status: string, customLabel?: string): string {
  if (customLabel) return customLabel;
  const raw = status || '';
  if (raw === 'PUBLIC_HOLIDAY') return 'Public Holiday';
  if (raw === 'SPECIAL_NON_WORKING_DAY') return 'Special Day';
  if (raw === 'SPECIAL_WORKING_DAY') return 'Working Day';
  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly label = input<string>();
  readonly variant = input<'pill' | 'dot' | 'chip'>('pill');
  readonly size = input<'sm' | 'md'>('sm');

  readonly category = computed<StatusCategory>(() => getStatusCategory(this.status()));
  readonly displayLabel = computed<string>(() => formatStatusLabel(this.status(), this.label()));
}
