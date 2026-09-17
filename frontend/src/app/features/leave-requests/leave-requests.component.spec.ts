import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaveRequestsComponent } from './leave-requests.component';
import { Injector, runInInjectionContext } from '@angular/core';
import { of } from 'rxjs';
import { LeaveRequestService } from '../../core/services/leave-request.service';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardStateService } from '../dashboard/services/dashboard-state.service';

describe('LeaveRequestsComponent Stepper Reactivity', () => {
  let component: LeaveRequestsComponent;
  let leaveRequestServiceMock: {
    listMine: ReturnType<typeof vi.fn>;
    createDraft: ReturnType<typeof vi.fn>;
    submit: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
  let dashboardStateMock: {
    profile: ReturnType<typeof vi.fn>;
    leaveBalances: ReturnType<typeof vi.fn>;
    loadDashboard: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    leaveRequestServiceMock = {
      listMine: vi.fn().mockReturnValue(of({ data: [] })),
      createDraft: vi.fn(),
      submit: vi.fn(),
      cancel: vi.fn().mockReturnValue(of({ id: 'req-1', status: 'CANCELLED' })),
    };

    dashboardStateMock = {
      profile: vi.fn().mockReturnValue(null),
      leaveBalances: vi.fn().mockReturnValue([]),
      loadDashboard: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: vi.fn().mockReturnValue(true),
            logout: vi.fn(),
          },
        },
        {
          provide: LeaveRequestService,
          useValue: leaveRequestServiceMock,
        },
        {
          provide: DashboardStateService,
          useValue: dashboardStateMock,
        },
      ],
    });

    component = runInInjectionContext(injector, () => new LeaveRequestsComponent());
  });

  it('should initially have 0 calculated duration and invalid step 2', () => {
    expect(component.calculatedDuration()).toBe(0);
    expect(component.step2Valid()).toBe(false);
  });

  it('should reactively update duration and step2Valid when dates are selected', () => {
    // 2026-09-14 is Monday, 2026-09-18 is Friday (5 working days)
    const startDate = new Date(2026, 8, 14); // month is 0-indexed: 8 = Sep
    const endDate = new Date(2026, 8, 18);

    component.onStartDateChange(startDate);
    component.onEndDateChange(endDate);

    expect(component.startDate()).toBe('2026-09-14');
    expect(component.endDate()).toBe('2026-09-18');
    expect(component.calculatedDuration()).toBe(5);
    expect(component.step2Valid()).toBe(true);
    expect(component.isReadyToSubmit()).toBe(true);
  });

  it('should reactively deduct half days', () => {
    component.onStartDateChange(new Date(2026, 8, 14));
    component.onEndDateChange(new Date(2026, 8, 18));
    expect(component.calculatedDuration()).toBe(5);

    component.halfDayStart.set(true);
    expect(component.calculatedDuration()).toBe(4.5);

    component.halfDayEnd.set(true);
    expect(component.calculatedDuration()).toBe(4);
  });

  it('should enforce reason requirement for unpaid leave', () => {
    component.onStartDateChange(new Date(2026, 8, 14));
    component.onEndDateChange(new Date(2026, 8, 18));
    component.selectLeaveType('UNPAID');

    expect(component.step2Valid()).toBe(false);

    component.reason.set('Family emergency');
    expect(component.step2Valid()).toBe(true);
  });

  it('should block step 2 if end date is before start date', () => {
    component.onStartDateChange(new Date(2026, 8, 20));
    component.onEndDateChange(new Date(2026, 8, 15));

    expect(component.calculatedDuration()).toBe(0);
    expect(component.step2Valid()).toBe(false);
  });

  it('should call leaveRequestService.cancel on cancelRequest when confirmed', () => {
    globalThis.confirm = vi.fn().mockReturnValue(true);
    component.cancelRequest('req-1');
    expect(leaveRequestServiceMock.cancel).toHaveBeenCalledWith('req-1');
  });

  it('should not call leaveRequestService.cancel if confirm is cancelled', () => {
    globalThis.confirm = vi.fn().mockReturnValue(false);
    component.cancelRequest('req-1');
    expect(leaveRequestServiceMock.cancel).not.toHaveBeenCalled();
  });
});
