import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { MeService } from '../me/me.service';
import { OAuthService } from 'angular-oauth2-oidc';

/**
 * Requires valid token + ACTIVE employee status.
 * PENDING users go to /pending-setup.
 */
export const employeeGuard: CanActivateFn = () => {
  const oauth = inject(OAuthService);
  const meService = inject(MeService);
  const router = inject(Router);

  if (!oauth.hasValidAccessToken()) {
    oauth.initCodeFlow(undefined, { kc_idp_hint: 'google' });
    return router.parseUrl('/');
  }

  return meService.loadMe().pipe(
    map((me) => {
      if (me.linked && me.employeeStatus === 'ACTIVE') {
        return true;
      }
      return router.parseUrl('/pending-setup');
    }),
    catchError(() => of(router.parseUrl('/')))
  );
};
