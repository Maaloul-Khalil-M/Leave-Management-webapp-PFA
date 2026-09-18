import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {map, catchError, of} from 'rxjs';
import {OAuthService} from 'angular-oauth2-oidc';
import {MeService} from './test/me.service';

export const employeeGuard: CanActivateFn = () => {
  const oauth = inject(OAuthService);
  const router = inject(Router);
  const meService = inject(MeService);

  if (!oauth.hasValidAccessToken()) {
    router.navigate(['/login']);
    return false;
  }

  return meService.loadMe().pipe(
    map((me) => {
      if (me.accountStatus === 'ACTIVE') {
        return true;
      }

      router.navigate(['/no-profile'], {
        queryParams: { reason: me.accountStatus?.toLowerCase() },
      });
      return false;
    }),
    catchError(() => {
      router.navigate(['/no-profile']);
      return of(false);
    })
  );
};
