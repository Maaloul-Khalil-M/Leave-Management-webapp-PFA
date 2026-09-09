import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';

/**
 * Attach the Keycloak access token only to requests aimed at our API.
 * Never leak the token to third-party origins.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oauthService = inject(OAuthService);
  const token = oauthService.getAccessToken();

  if (!token || !req.url.startsWith('http://localhost:8081')) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    })
  );
};
