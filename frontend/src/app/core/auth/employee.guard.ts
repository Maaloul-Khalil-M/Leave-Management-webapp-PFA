import {inject} from '@angular/core';
import {CanActivateFn} from '@angular/router';
import {map, catchError, of} from 'rxjs';
import {OAuthService} from 'angular-oauth2-oidc';
import {MeService} from './test/me.service';

export const employeeGuard: CanActivateFn = () => {
  const oauth = inject(OAuthService);
  const meService = inject(MeService);

  if (!oauth.hasValidAccessToken()) {
    alert('You are not logged in. Please sign in with Google.');
    oauth.initCodeFlow(undefined, {kc_idp_hint: 'google'});

    return false;
  }

  return meService.loadMe().pipe(
    map((me) => {
      if (me.accountStatus === 'ACTIVE') {
        return true;
      }

      alert(`Your account is ${me.accountStatus}.`);
      return false;
    }),
    catchError(() => {
      alert('Unable to load your user account.');
      return of(false);
    })
  );
};
