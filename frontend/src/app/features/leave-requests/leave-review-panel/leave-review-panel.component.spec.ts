import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { LeaveReviewPanelComponent } from './leave-review-panel.component';

describe('LeaveReviewPanelComponent', () => {
  let component: LeaveReviewPanelComponent;

  beforeEach(() => {
    component = new LeaveReviewPanelComponent();
    component.leaveTypeMeta = {
      code: 'PAID_ANNUAL',
      title: 'Paid Annual',
      icon: 'beach_access',
      description: 'Standard vacation',
    };
    component.startDate = '2026-10-01';
    component.endDate = '2026-10-10';
    component.durationDays = 5;
    component.availableBalance = 16;
  });

  it('calculates remaining balance correctly when sufficient', () => {
    expect(component.remainingAfter).toBe(11);
    expect(component.hasDeficit).toBe(false);
    expect(component.deficitAmount).toBe(0);
    expect(component.canSubmit).toBe(true);
  });

  it('calculates deficit correctly when requested exceeds available', () => {
    component.durationDays = 25;
    component.availableBalance = 10;
    expect(component.remainingAfter).toBe(-15);
    expect(component.hasDeficit).toBe(true);
    expect(component.deficitAmount).toBe(15);
  });

  it('blocks submission when eligibility has blocking explanations', () => {
    component.eligibility = {
      eligible: false,
      durationDays: 25,
      availableBalance: 10,
      blockingCode: 'INSUFFICIENT_BALANCE',
      reasons: ['Not enough leave'],
      explanations: [
        {
          code: 'INSUFFICIENT_BALANCE',
          severity: 'BLOCKING',
          title: 'Not enough paid leave',
          body: 'You only have 10 available.',
        },
        {
          code: 'SHORT_NOTICE',
          severity: 'WARNING',
          title: 'Short notice',
          body: 'Requested with short notice.',
        },
      ],
    };

    expect(component.canSubmit).toBe(false);
    expect(component.blockingExplanations.length).toBe(1);
    expect(component.warningExplanations.length).toBe(1);
  });

  it('allows submission when only warnings exist', () => {
    component.eligibility = {
      eligible: true,
      durationDays: 2,
      availableBalance: 10,
      blockingCode: null,
      reasons: [],
      explanations: [
        {
          code: 'SHORT_NOTICE',
          severity: 'WARNING',
          title: 'Short notice',
          body: 'Requested with short notice.',
        },
      ],
    };

    expect(component.canSubmit).toBe(true);
    expect(component.blockingExplanations.length).toBe(0);
    expect(component.warningExplanations.length).toBe(1);
  });
});