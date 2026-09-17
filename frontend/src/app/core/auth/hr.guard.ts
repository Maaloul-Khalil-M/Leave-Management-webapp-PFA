import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { AuthService } from './auth.service';

export const hrGuard: CanActivateFn = () => {
  const oauth = inject(OAuthService);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!oauth.hasValidAccessToken()) {
    oauth.initCodeFlow(undefined, { kc_idp_hint: 'google' });
    return false;
  }

  if (auth.hasAnyRole('HR', 'ADMIN')) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
