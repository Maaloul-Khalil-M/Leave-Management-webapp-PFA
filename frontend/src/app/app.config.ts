import {
  ApplicationConfig, inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import {provideRouter} from '@angular/router';
import {routes} from './app.routes';
import {provideEchartsCore} from 'ngx-echarts';
import * as echarts from 'echarts';
import {OAuthService, provideOAuthClient} from 'angular-oauth2-oidc';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {authInterceptor} from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideEchartsCore({echarts}),
    provideOAuthClient(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => {
      const oauth = inject(OAuthService);
      oauth.configure({
        issuer: 'http://localhost:9090/realms/leave-workforce',
        clientId: 'angular-app',
        responseType: 'code',
        redirectUri: window.location.origin,
        scope: 'openid profile email',
        showDebugInformation: true,
        strictDiscoveryDocumentValidation: false,
        useSilentRefresh: false,
      });
      return oauth.loadDiscoveryDocumentAndTryLogin();
    }),
    provideBrowserGlobalErrorListeners()
  ]
};
