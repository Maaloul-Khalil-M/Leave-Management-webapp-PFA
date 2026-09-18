import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NoProfileComponent } from './no-profile.component';
import { AuthService } from '../auth.service';

describe('NoProfileComponent', () => {
  const createComponent = (queryParams: Record<string, string> = {}, loggedIn = true) => {
    const queryParamMapMock = {
      get: vi.fn((key: string) => queryParams[key] ?? null),
    };

    const authServiceMock = {
      isLoggedIn: signal(loggedIn),
      email: signal('visitor@example.com'),
      logout: vi.fn(),
    };

    const routerMock = {
      navigate: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: queryParamMapMock,
            },
          },
        },
      ],
    });

    const component = runInInjectionContext(injector, () => new NoProfileComponent());
    return { component, authServiceMock, routerMock };
  };

  it('renders default no-profile content when no query param is provided', () => {
    const { component } = createComponent();
    expect(component.title()).toBe('No Employee Profile');
    expect(component.description()).toContain('No employee profile exists');
    expect(component.userEmail()).toBe('visitor@example.com');
  });

  it('renders suspended title and description when reason is suspended', () => {
    const { component } = createComponent({ reason: 'suspended' });
    expect(component.isSuspended()).toBe(true);
    expect(component.title()).toBe('Account Suspended');
    expect(component.description()).toContain('suspended');
  });

  it('redirects to /login on ngOnInit when user is not authenticated', () => {
    const { component, routerMock } = createComponent({}, false);
    component.ngOnInit();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('calls auth.logout when onSignOut is clicked', () => {
    const { component, authServiceMock } = createComponent();
    component.onSignOut();
    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
  });
});
