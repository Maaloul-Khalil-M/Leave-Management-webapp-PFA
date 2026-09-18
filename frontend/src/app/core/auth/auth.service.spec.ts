import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { Subject } from 'rxjs';
import { OAuthService, OAuthEvent } from 'angular-oauth2-oidc';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let oauthServiceMock: {
    events: Subject<OAuthEvent>;
    hasValidAccessToken: ReturnType<typeof vi.fn>;
    getIdToken: ReturnType<typeof vi.fn>;
    getAccessToken: ReturnType<typeof vi.fn>;
    getIdentityClaims: ReturnType<typeof vi.fn>;
    initCodeFlow: ReturnType<typeof vi.fn>;
    logOut: ReturnType<typeof vi.fn>;
    clientId: string;
  };

  beforeEach(() => {
    oauthServiceMock = {
      events: new Subject<OAuthEvent>(),
      hasValidAccessToken: vi.fn().mockReturnValue(true),
      getIdToken: vi.fn().mockReturnValue('mock-id-token-xyz'),
      getAccessToken: vi.fn().mockReturnValue(''),
      getIdentityClaims: vi.fn().mockReturnValue(null),
      initCodeFlow: vi.fn(),
      logOut: vi.fn(),
      clientId: 'angular-app',
    };

    const injector = Injector.create({
      providers: [
        { provide: OAuthService, useValue: oauthServiceMock },
      ],
    });

    service = runInInjectionContext(injector, () => new AuthService());
  });

  describe('Sign-out flow', () => {
    it('supplies id_token_hint when ID token is present', () => {
      oauthServiceMock.getIdToken.mockReturnValue('jwt.id-token.signature');

      service.logout();

      expect(oauthServiceMock.logOut).toHaveBeenCalledWith({
        id_token_hint: 'jwt.id-token.signature',
      });
    });

    it('supplies client_id as fallback in the missing-id_token_hint scenario', () => {
      oauthServiceMock.getIdToken.mockReturnValue(null);

      service.logout();

      expect(oauthServiceMock.logOut).toHaveBeenCalledWith({
        client_id: 'angular-app',
      });
    });

    it('supplies client_id fallback when ID token is an empty string', () => {
      oauthServiceMock.getIdToken.mockReturnValue('');

      service.logout();

      expect(oauthServiceMock.logOut).toHaveBeenCalledWith({
        client_id: 'angular-app',
      });
    });
  });

  describe('Authentication and Roles', () => {
    it('initializes isLoggedIn based on hasValidAccessToken', () => {
      expect(service.isLoggedIn()).toBe(true);
    });

    it('extracts realm and client roles from access token JWT', () => {
      const payload = {
        realm_access: { roles: ['EMPLOYEE'] },
        resource_access: { 'angular-app': { roles: ['HR'] } },
      };
      const token = `header.${btoa(JSON.stringify(payload))}.sig`;
      oauthServiceMock.getAccessToken.mockReturnValue(token);

      expect(service.roles()).toEqual(['EMPLOYEE', 'HR']);
      expect(service.hasRole('HR')).toBe(true);
      expect(service.hasRole('ADMIN')).toBe(false);
      expect(service.hasAnyRole('MANAGER', 'HR')).toBe(true);
    });

    it('initiates Google login code flow with kc_idp_hint', () => {
      service.loginWithGoogle();

      expect(oauthServiceMock.initCodeFlow).toHaveBeenCalledWith(undefined, {
        kc_idp_hint: 'google',
      });
    });
  });
});
