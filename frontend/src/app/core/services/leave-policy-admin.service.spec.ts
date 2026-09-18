import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { LeavePolicyAdminService, LeavePolicyResponse, CreateLeavePolicyRequest } from './leave-policy-admin.service';
import { PageResponse } from './leave-request.service';

describe('LeavePolicyAdminService', () => {
  let service: LeavePolicyAdminService;
  let httpMock: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };

  const mockPolicy: LeavePolicyResponse = {
    id: 'pol-1',
    country: 'TN',
    leaveTypeCode: 'PAID_ANNUAL',
    accrualUnit: 'WORKING_DAY',
    accrualRate: 1.83,
    maxBalance: 30,
    minBlockDays: 1,
    noticeDays: 3,
    bonuses: [
      {
        label: 'Seniority +1d',
        appliesTo: 'RATE',
        isOverride: false,
        amount: 1,
        minYearsOfService: 5,
        everyNYears: 5,
      },
    ],
  };

  beforeEach(() => {
    httpMock = {
      get: vi.fn(),
      post: vi.fn(),
    };

    const injector = Injector.create({
      providers: [{ provide: HttpClient, useValue: httpMock }],
    });

    service = runInInjectionContext(injector, () => new LeavePolicyAdminService());
  });

  it('should list leave policies without filter', () => {
    const pageResponse: PageResponse<LeavePolicyResponse> = {
      data: [mockPolicy],
      pagination: { nextCursor: null, hasMore: false, limit: 1 },
    };
    httpMock.get.mockReturnValue(of(pageResponse));

    let result: PageResponse<LeavePolicyResponse> | undefined;
    service.listLeavePolicies().subscribe((res) => (result = res));

    expect(httpMock.get).toHaveBeenCalledWith('http://localhost:8080/api/hr/leave-policies', {
      params: expect.any(HttpParams),
    });
    expect(result).toEqual(pageResponse);
  });

  it('should list leave policies with country filter', () => {
    const pageResponse: PageResponse<LeavePolicyResponse> = {
      data: [mockPolicy],
      pagination: { nextCursor: null, hasMore: false, limit: 1 },
    };
    httpMock.get.mockReturnValue(of(pageResponse));

    service.listLeavePolicies('TN').subscribe();

    expect(httpMock.get).toHaveBeenCalledWith('http://localhost:8080/api/hr/leave-policies', {
      params: expect.any(HttpParams),
    });
  });

  it('should get leave policy by id', () => {
    httpMock.get.mockReturnValue(of(mockPolicy));

    let result: LeavePolicyResponse | undefined;
    service.getLeavePolicyById('pol-1').subscribe((res) => (result = res));

    expect(httpMock.get).toHaveBeenCalledWith('http://localhost:8080/api/hr/leave-policies/pol-1');
    expect(result).toEqual(mockPolicy);
  });

  it('should create a new leave policy version', () => {
    httpMock.post.mockReturnValue(of(mockPolicy));

    const createReq: CreateLeavePolicyRequest = {
      country: 'TN',
      leaveTypeCode: 'PAID_ANNUAL',
      accrualUnit: 'WORKING_DAY',
      accrualRate: 1.83,
      maxBalance: 30,
      minBlockDays: 1,
      noticeDays: 3,
      bonuses: [],
    };

    let result: LeavePolicyResponse | undefined;
    service.createLeavePolicy(createReq).subscribe((res) => (result = res));

    expect(httpMock.post).toHaveBeenCalledWith('http://localhost:8080/api/hr/leave-policies', createReq);
    expect(result).toEqual(mockPolicy);
  });
});
