import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { of, throwError } from 'rxjs';
import { employeeGuard } from './employee.guard';
import { MeService, UserResponse } from './test/me.service';

describe('employeeGuard', () => {
  let routerMock: { navigate: ReturnType<typeof vi.fn> };
  let oauthServiceMock: { hasValidAccessToken: ReturnType<typeof vi.fn> };
  let meServiceMock: { loadMe: ReturnType<typeof vi.fn> };
  let injector: Injector;

  beforeEach(() => {
    routerMock = { navigate: vi.fn() };
    oauthServiceMock = { hasValidAccessToken: vi.fn().mockReturnValue(true) };
    meServiceMock = { loadMe: vi.fn() };

    injector = Injector.create({
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: OAuthService, useValue: oauthServiceMock },
        { provide: MeService, useValue: meServiceMock },
      ],
    });
  });

  it('redirects unauthenticated users to /login and returns false', () => {
    oauthServiceMock.hasValidAccessToken.mockReturnValue(false);

    const result = runInInjectionContext(injector, () =>
      employeeGuard({} as any, {} as any)
    );

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('allows access for active employee accounts', async () => {
    const mockUser: Partial<UserResponse> = { accountStatus: 'ACTIVE' };
    meServiceMock.loadMe.mockReturnValue(of(mockUser as UserResponse));

    const result$ = runInInjectionContext(injector, () =>
      employeeGuard({} as any, {} as any)
    ) as any;

    const result = await new Promise((resolve) => result$.subscribe(resolve));
    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('redirects to /no-profile with reason when account is SUSPENDED', async () => {
    const mockUser = { accountStatus: 'SUSPENDED' };
    meServiceMock.loadMe.mockReturnValue(of(mockUser as any));

    const result$ = runInInjectionContext(injector, () =>
      employeeGuard({} as any, {} as any)
    ) as any;

    const result = await new Promise((resolve) => result$.subscribe(resolve));
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/no-profile'], {
      queryParams: { reason: 'suspended' },
    });
  });

  it('redirects to /no-profile when user profile fails to load (e.g. 404/not found)', async () => {
    meServiceMock.loadMe.mockReturnValue(
      throwError(() => new Error('User not found'))
    );

    const result$ = runInInjectionContext(injector, () =>
      employeeGuard({} as any, {} as any)
    ) as any;

    const result = await new Promise((resolve) => result$.subscribe(resolve));
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/no-profile']);
  });
});
