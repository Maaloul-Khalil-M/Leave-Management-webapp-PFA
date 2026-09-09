import {Injectable, inject, signal, computed} from '@angular/core';
import {OAuthService} from 'angular-oauth2-oidc';

/**
 * OIDC client against Keycloak. Roles are read from the access token JWT
 * (realm_access.roles + resource_access['angular-app'].roles) — same source
 * Spring Security uses. App DB never stores roles.
 */
@Injectable({providedIn: 'root'})
export class AuthService {
  private readonly oauthService = inject(OAuthService);

  readonly isLoggedIn = signal(false);

  readonly username = computed(() => {
    const claims = this.identityClaims();
    return (claims?.['preferred_username'] as string) ?? (claims?.['email'] as string) ??
           null;
  });

  readonly email = computed(() => {
    const claims = this.identityClaims();
    return (claims?.['email'] as string) ?? null;
  });

  /** Realm + client roles from the access token (not ID token). */
  readonly roles = computed(() => this.extractRoles());

  constructor() {
    this.oauthService.events.subscribe(() => {
      this.isLoggedIn.set(this.oauthService.hasValidAccessToken());
    });
    this.isLoggedIn.set(this.oauthService.hasValidAccessToken());
  }

  loginWithGoogle(): void {
    this.oauthService.initCodeFlow(undefined, {
      kc_idp_hint: 'google',
    });
  }

  logout(): void {
    this.oauthService.logOut();
  }

  get accessToken(): string {
    return this.oauthService.getAccessToken();
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  hasAnyRole(...roles: string[]): boolean {
    const mine = this.roles();
    return roles.some((r) => mine.includes(r));
  }

  private identityClaims(): Record<string, unknown> | null {
    return this.oauthService.getIdentityClaims() as Record<string, unknown> | null;
  }

  private extractRoles(): string[] {
    const token = this.oauthService.getAccessToken();
    if (!token) return [];
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const realmRoles: string[] = payload?.realm_access?.roles ?? [];
      const clientRoles: string[] = payload?.resource_access?.['angular-app']?.roles ??
        [];
      return [...new Set([...realmRoles, ...clientRoles])].sort();
    } catch {
      return [];
    }
  }
}
