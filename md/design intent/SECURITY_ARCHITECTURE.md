# Security Architecture — Leave Management Webapp

> **Purpose**: Full end-to-end explanation of how authentication and authorisation work across every layer: Keycloak → Spring Security (backend) → Angular (frontend).

---

## Table of Contents

1. [Big Picture](#1-big-picture)
2. [Keycloak — the Identity Provider](#2-keycloak--the-identity-provider)
3. [The JWT Token — the single source of truth](#3-the-jwt-token--the-single-source-of-truth)
4. [Angular Frontend — authentication & route protection](#4-angular-frontend--authentication--route-protection)
5. [Spring Backend — JWT validation & authorisation](#5-spring-backend--jwt-validation--authorisation)
6. [End-to-End Request Flow](#6-end-to-end-request-flow)
7. [Role-to-Endpoint Mapping](#7-role-to-endpoint-mapping)
8. [Known Gaps & Issues](#8-known-gaps--issues)

---

## 1. Big Picture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           BROWSER (User)                            │
│                                                                     │
│   Angular SPA (port 4200)                                           │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │  angular-oauth2-oidc                                        │  │
│   │  • Handles Authorization Code + PKCE flow                   │  │
│   │  • Stores access/id tokens in sessionStorage/localStorage   │  │
│   │  • authInterceptor injects Bearer token on every API call   │  │
│   └──────────────────────────┬──────────────────────────────────┘  │
│                              │  HTTP + Authorization: Bearer <JWT>  │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
               ┌───────────────▼────────────────┐
               │    Spring Boot API (port 8080)  │
               │                                │
               │  SecurityConfig (filter chain) │
               │  • Validates JWT signature     │
               │  • Validates iss claim         │
               │  • Extracts roles from JWT     │
               │  • Enforces path-based rules   │
               │  • Supports @PreAuthorize      │
               └───────────────┬────────────────┘
                               │  JWK fetch (signing keys)
               ┌───────────────▼────────────────┐
               │  Keycloak (port 9090)           │
               │  Realm: leave-workforce         │
               │  Client: angular-app            │
               │  Roles: EMPLOYEE, HR, ADMIN...  │
               └────────────────────────────────┘
```

**Key principle**: Keycloak is the only place that issues and signs tokens. Spring validates them cryptographically. Angular trusts the token for UI decisions, but the backend is the real enforcement point.

---

## 2. Keycloak — the Identity Provider

**Container**: `leave-keycloak` (Keycloak 26.5), exposed at `http://localhost:9090`
**Realm**: `leave-workforce`
**Realm JSON**: [`leave-workforce-realm.json`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/leave-workforce-realm.json)

### 2.1 The `angular-app` Client

| Property | Value |
|---|---|
| Client ID | `angular-app` |
| Type | **Public** (no client secret — safe for SPAs) |
| Flow | Authorization Code + **PKCE** (`S256`) |
| Redirect URI | `http://localhost:4200/*` |
| Web Origins | `http://localhost:4200` |
| Scopes | `openid`, `profile`, `email`, `roles` (default) |
| Implicit flow | ❌ Disabled |
| Direct access grants | ❌ Disabled |

> [!IMPORTANT]
> Because the client is **public**, there is no client secret. Security relies entirely on PKCE and the allowed redirect URIs. Any redirect URI not in Keycloak's list will be rejected.

### 2.2 Realm Roles

These are defined at the **realm level** and appear in the `realm_access.roles` claim of every JWT.

| Role | Composite | Description |
|---|---|---|
| `EMPLOYEE` | ✅ Yes | Default user role — probably inherits `USER` |
| `HR` | ✅ Yes | HR staff — can manage employees, analytics, leave policies |
| `ADMIN` | ✅ Yes | Super-admin — everything HR can do + admin-only routes |
| `USER` | ❌ No | Base role (likely a building block for composites) |
| `offline_access` | ❌ No | Keycloak built-in (offline tokens) |
| `uma_authorization` | ❌ No | Keycloak built-in (UMA) |

> [!NOTE]
> `EMPLOYEE`, `HR`, and `ADMIN` are **composite roles** in Keycloak. This means they can include other roles. For example, `ADMIN` likely includes `HR`, which includes `EMPLOYEE`. This lets you assign a single role and get all the lower-level permissions automatically.

### 2.3 How a JWT looks (decoded)

```json
{
  "iss": "http://localhost:9090/realms/leave-workforce",
  "sub": "some-keycloak-uuid",
  "email": "user@example.com",
  "preferred_username": "jdoe",
  "realm_access": {
    "roles": ["EMPLOYEE", "USER", "offline_access", "uma_authorization"]
  },
  "resource_access": {
    "angular-app": {
      "roles": []
    }
  }
}
```

The `sub` (subject) claim is the Keycloak user's unique identifier. It is used by [`CurrentUserServiceImpl`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/backend/src/main/java/com/stagepfa/demo/services/impl/CurrentUserServiceImpl.java) to link a Keycloak identity to an internal `User` record.

---

## 3. The JWT Token — the single source of truth

The JWT is the **only credential** that flows through the system. No sessions, no cookies (for auth), no API keys.

```
JWT structure: header.payload.signature

Signed by Keycloak with RS256 (RSA + SHA-256).
Spring fetches Keycloak's public keys from the JWK Set URI to verify the signature.
```

**JWT lifetime**: Standard Keycloak defaults — typically short-lived access tokens (5 minutes) with a refresh token usable by the Angular OIDC library.

### Where tokens live

| Token | Stored in | Used by |
|---|---|---|
| Access Token | `angular-oauth2-oidc` internal storage | Angular interceptor → `Authorization: Bearer` header |
| ID Token | `angular-oauth2-oidc` internal storage | Angular AuthService for user profile claims |
| Refresh Token | `angular-oauth2-oidc` internal storage | Angular OIDC lib auto-renews access token |

---

## 4. Angular Frontend — authentication & route protection

**Library**: [`angular-oauth2-oidc`](https://www.npmjs.com/package/angular-oauth2-oidc) v22

### 4.1 Initialisation (`app.config.ts`)

[`app.config.ts`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/frontend/src/app/app.config.ts) bootstraps the OIDC client before the app renders:

```typescript
oauth.configure({
  issuer: 'http://localhost:9090/realms/leave-workforce',
  clientId: 'angular-app',
  responseType: 'code',           // Authorization Code flow
  redirectUri: window.location.origin,
  scope: 'openid profile email',
  strictDiscoveryDocumentValidation: false,
  useSilentRefresh: false,
});
oauth.loadDiscoveryDocumentAndTryLogin({ disableNonceCheck: true });
```

On startup, the library fetches Keycloak's **OIDC Discovery Document** (`/.well-known/openid-configuration`) to auto-configure endpoints (authorize, token, JWKS, logout).

> [!WARNING]
> `disableNonceCheck: true` and `strictDiscoveryDocumentValidation: false` are relaxed settings — acceptable in development but should be tightened for production.

### 4.2 Login Flow

```
User clicks Login
     │
     ▼
OAuthService.initCodeFlow()
     │  Redirects browser to Keycloak login page
     ▼
User enters credentials at Keycloak (port 9090)
     │  Keycloak redirects back to Angular with ?code=...
     ▼
angular-oauth2-oidc exchanges code for tokens
     │  POST to Keycloak /token endpoint
     ▼
Access token + ID token + Refresh token stored
     │
     ▼
isLoggedIn signal set to true → UI unlocks
```

There is also a **Google social login** path:
```typescript
oauthService.initCodeFlow(undefined, { kc_idp_hint: 'google' });
```
This tells Keycloak to skip its own login page and redirect to Google immediately.

### 4.3 `AuthService` — role extraction

[`auth.service.ts`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/frontend/src/app/core/auth/auth.service.ts) reads roles **directly from the JWT payload** (client-side decode, no network call):

```typescript
private extractRoles(): string[] {
  const payload = JSON.parse(atob(token.split('.')[1]));
  const realmRoles = payload?.realm_access?.roles ?? [];
  const clientRoles = payload?.resource_access?.['angular-app']?.roles ?? [];
  return [...new Set([...realmRoles, ...clientRoles])].sort();
}
```

> [!NOTE]
> This is safe because roles are **only used for UI decisions** (show/hide menus, route guards). The backend re-validates the same token cryptographically and makes the real access control decision. A user cannot fake roles in the frontend without a valid Keycloak-signed token.

### 4.4 `authInterceptor` — attaching the token

[`auth.interceptor.ts`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/frontend/src/app/core/auth/auth.interceptor.ts) attaches the token **only to your own API**:

```typescript
if (!token || !req.url.startsWith('http://localhost:8080')) {
  return next(req);   // no token for third-party requests
}
req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
```

> [!IMPORTANT]
> The URL check `startsWith('http://localhost:8080')` is **hardcoded** for local dev. This must be externalised to an environment variable before going to production, otherwise the token will never be sent in deployed environments.

### 4.5 Route Guards

Two route guards protect the Angular routes:

#### `employeeGuard`
[`employee.guard.ts`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/frontend/src/app/core/auth/employee.guard.ts)

1. Checks `oauth.hasValidAccessToken()` → redirects to `/login` if not authenticated
2. Calls the backend `/me` endpoint (via `MeService`) to check the user's `accountStatus`
3. Only allows entry if `accountStatus === 'ACTIVE'`
4. Redirects to `/no-profile` if inactive/unprovisioned

#### `hrGuard`
[`hr.guard.ts`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/frontend/src/app/core/auth/hr.guard.ts)

1. Checks `oauth.hasValidAccessToken()` → redirects to `/login` if not authenticated
2. Checks `auth.hasAnyRole('HR', 'ADMIN')` from the JWT
3. Redirects to `/dashboard` if authenticated but lacking the required role

### 4.6 Route Protection Map

| Route | Guard | Access |
|---|---|---|
| `/login` | None | Public |
| `/no-profile` | None | Public |
| `/dashboard` | `employeeGuard` | Any active user |
| `/leave-requests` | `employeeGuard` | Any active user |
| `/manager/approvals` | `employeeGuard` | Any active user (but backend enforces manager check) |
| `/management/employees` | `hrGuard` | `HR` or `ADMIN` only |
| `/management/organization` | `hrGuard` | `HR` or `ADMIN` only |
| `/management/analytics` | `hrGuard` | `HR` or `ADMIN` only |
| `/dev/auth-test` | **None** ⚠️ | Public — dev route, no guard |

> [!CAUTION]
> `/dev/auth-test` has **no guard** at all. This should be removed or protected before production deployment.

---

## 5. Spring Backend — JWT validation & authorisation

### 5.1 SecurityConfig — the filter chain

[`SecurityConfig.java`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/backend/src/main/java/com/stagepfa/demo/config/SecurityConfig.java) is the central security configuration.

#### Filter chain setup:

```
Incoming HTTP Request
       │
       ▼
CORS filter (allows http://localhost:4200)
       │
       ▼
OPTIONS preflight? → ✅ Pass through (no auth needed)
       │
       ▼
Public path? (/actuator/health, /swagger-ui, /api/public/**)
       │ Yes → ✅ Pass through
       │ No
       ▼
JWT present and valid?
       │  Spring calls Keycloak's JWK Set URI to verify signature
       │  Validates: signature, issuer, expiry
       │ Invalid → 401 Unauthorized
       │ Valid
       ▼
Extract roles from JWT (extractAuthorities method)
       │  Reads realm_access.roles + resource_access.angular-app.roles
       │  Maps each role to ROLE_<name> GrantedAuthority
       ▼
Path-based authorisation rules
       │  /api/admin/**     → ROLE_ADMIN only
       │  /api/hr/**        → ROLE_HR or ROLE_ADMIN
       │  /api/employee/**  → any authenticated user
       │  /api/manager/**   → any authenticated user
       │  Everything else   → any authenticated user
       ▼
Method-level @PreAuthorize (if present)
       ▼
Controller / Service logic
```

#### Session policy: **STATELESS**

```java
.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
```

No server-side session is created. Every request is self-contained with its JWT. This is correct for a REST API with Bearer token auth.

#### CSRF: **Disabled**

```java
.csrf(csrf -> csrf.disable())
```

CSRF is disabled because there are no cookies used for authentication (Bearer tokens are not automatically sent by browsers, unlike cookies), so CSRF attacks don't apply here.

#### CORS configuration

Allowed origins come from `app.cors.allowed-origins` in `application.yaml`:
- `http://localhost:4200`
- `http://localhost:4300`

Allowed methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
Allowed headers: `Authorization, Content-Type`
Credentials: allowed

### 5.2 JWT Role Extraction

The custom `jwtAuthenticationConverter()` in `SecurityConfig` translates Keycloak's JWT claims into Spring's `GrantedAuthority` objects:

```java
private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
    // 1. Realm-level roles: jwt.realm_access.roles
    Map<String, Object> realmAccess = jwt.getClaim("realm_access");
    roles.addAll(realmAccess.get("roles"));

    // 2. Client-level roles: jwt.resource_access.angular-app.roles
    Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
    clientRoles → roles.add(...)

    // 3. Each role gets "ROLE_" prefix for Spring's hasRole() convention
    return roles.stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                .collect(toSet());
}
```

**Result**: A user with `realm_access.roles = ["HR"]` in their JWT gets `ROLE_HR` as a `GrantedAuthority`. Spring's `hasRole("HR")` matches against `ROLE_HR` automatically.

### 5.3 `CurrentUserServiceImpl` — linking JWT to DB

[`CurrentUserServiceImpl.java`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/backend/src/main/java/com/stagepfa/demo/services/impl/CurrentUserServiceImpl.java) bridges the Keycloak identity to your internal `User` entity:

```
JWT arrives in request
     │
     ▼
extractJwt() — reads from Spring SecurityContext
     │
     ▼
userService.findBySubject(jwt.getSubject())
     │  Found? → return User
     │  Not found?
     ▼
linkOnFirstLogin() — first time this user logs in
     │
     │  1. Read email from JWT
     │  2. Look up pre-provisioned User by email
     │  3. If found: call userService.recordLogin(user, subject, "KEYCLOAK")
     │     → sets keycloakSubject on the User record
     │  4. If not found: throw FORBIDDEN ("No account provisioned for your email")
     ▼
Check user.employeeId is set
     │  Not set → throw FORBIDDEN ("Account is not linked to an employee")
     │  Set → return User
```

**Design**: Accounts are **pre-provisioned** by HR/Admin before a user can log in. You cannot self-register. This is intentional for a leave management system.

### 5.4 `application.yaml` — key security properties

```yaml
spring:
  security:
    client-id: angular-app   # client roles namespace in JWT
  oauth2:
    resourceserver:
      jwt:
        issuer-uri:  http://localhost:9090/realms/leave-workforce
        jwk-set-uri: http://localhost:9090/realms/leave-workforce/protocol/openid-connect/certs
```

**`issuer-uri`**: Spring validates that the JWT's `iss` claim matches this value exactly.
**`jwk-set-uri`**: Spring fetches Keycloak's RSA public keys from here to verify the JWT signature. In Docker, these can differ (container-internal hostname vs browser-accessible hostname).

---

## 6. End-to-End Request Flow

### Normal authenticated request (e.g., employee viewing leave requests)

```
1. [Angular] User opens /leave-requests
2. [Angular] employeeGuard fires:
     a. oauth.hasValidAccessToken() → true (or redirects to /login)
     b. meService.loadMe() → backend returns {accountStatus: "ACTIVE"} → allow
3. [Angular] Component renders, calls GET http://localhost:8080/api/employee/leave-requests
4. [Angular] authInterceptor adds: Authorization: Bearer <jwt>
5. [Spring]  CORS filter checks origin → http://localhost:4200 is allowed
6. [Spring]  OAuth2ResourceServer filter intercepts:
     a. Extracts JWT from Authorization header
     b. Fetches JWK from Keycloak (cached after first call)
     c. Verifies JWT signature with Keycloak's RSA public key
     d. Checks iss = http://localhost:9090/realms/leave-workforce ✓
     e. Checks exp (expiry) ✓
     f. Calls extractAuthorities(jwt) → [ROLE_EMPLOYEE, ROLE_USER, ...]
     g. Creates JwtAuthenticationToken, stores in SecurityContext
7. [Spring]  Path-based rule: /api/employee/** → authenticated() → ✅
8. [Spring]  Controller calls CurrentUserServiceImpl.requireLinkedUser()
     a. Gets JWT from SecurityContext
     b. Finds User by keycloakSubject (or links on first login)
     c. Confirms employeeId is set
9. [Spring]  Business logic executes, returns data
10. [Angular] Component displays data
```

### Unauthorised access attempt (employee trying to access HR route)

```
1. [Angular] hrGuard checks auth.hasRole('HR') → false
2. [Angular] Redirects to /dashboard (never reaches backend)

If guard is bypassed (e.g., direct API call with curl):
3. [Spring]  JWT validates fine, user has ROLE_EMPLOYEE
4. [Spring]  Path rule: /api/hr/** → hasAnyRole("HR", "ADMIN") → ❌
5. [Spring]  Returns 403 Forbidden
```

---

## 7. Role-to-Endpoint Mapping

### Backend API endpoints

| Endpoint | HTTP Method | Role Required | Guard Layer |
|---|---|---|---|
| `/actuator/health` | GET | None (public) | Spring path rule |
| `/actuator/info` | GET | None (public) | Spring path rule |
| `/swagger-ui/**` | GET | None (public) | Spring path rule |
| `/api/public/**` | ANY | None (public) | Spring path rule |
| **Admin routes** | | | |
| `/api/admin/users` | GET, POST | `ADMIN` | Spring path + `@PreAuthorize` on class |
| `/api/admin/**` | ANY | `ADMIN` | Spring path rule |
| `/api/calendars` POST/PUT/DELETE | POST, PUT, DELETE | `ADMIN` | `@PreAuthorize("hasRole('ADMIN')")` |
| `/api/organization-settings` | PUT | `ADMIN` | `@PreAuthorize("hasRole('ADMIN')")` |
| **HR routes** | | | |
| `/api/hr/employees` | GET, POST | `HR` or `ADMIN` | Spring path + `@PreAuthorize` on class |
| `/api/hr/analytics` | GET | `HR` or `ADMIN` | Spring path + `@PreAuthorize` on class |
| `/api/hr/leave-policies` | GET, POST | `HR` or `ADMIN` | Spring path + `@PreAuthorize` on class |
| `/api/departments` | POST | `HR` or `ADMIN` | `@PreAuthorize("hasAnyRole('HR','ADMIN')")` |
| `/api/positions` | POST | `HR` or `ADMIN` | `@PreAuthorize("hasAnyRole('HR','ADMIN')")` |
| **Employee routes** | | | |
| `/api/employee/**` | ANY | Authenticated | Spring path rule |
| `/api/employee/leave-requests` | GET, POST | Authenticated | Spring path rule |
| `/api/employee/leave-ledgers` | GET | Authenticated | Spring path rule |
| `/api/documents/**` | GET, POST | Authenticated | Spring path rule |
| `/api/notifications` | GET, POST | Authenticated | Spring path rule |
| **Manager routes** | | | |
| `/api/manager/**` | ANY | Authenticated | Spring path rule |
| `/api/manager/leave-requests/pending` | GET | Authenticated | Spring path rule |
| `/api/manager/leave-requests/{id}/approve` | POST | Authenticated | Spring path rule |
| `/api/manager/leave-requests/{id}/reject` | POST | Authenticated | Spring path rule |
| **Reference data** | | | |
| `/api/departments` | GET | Authenticated | Spring path rule |
| `/api/positions` | GET | Authenticated | Spring path rule |
| `/api/calendars` | GET | Authenticated | Spring path rule |
| `/api/organization-settings` | GET | Authenticated | Spring path rule |

### Frontend routes vs backend enforcement

| Frontend Route | Angular Guard | Backend enforcement |
|---|---|---|
| `/dashboard` | `employeeGuard` | `/api/employee/**` → authenticated |
| `/leave-requests` | `employeeGuard` | `/api/employee/leave-requests` → authenticated |
| `/manager/approvals` | `employeeGuard` | `/api/manager/**` → authenticated |
| `/management/employees` | `hrGuard` (HR\|ADMIN) | `/api/hr/**` → HR\|ADMIN |
| `/management/organization` | `hrGuard` (HR\|ADMIN) | `/api/organization-settings` → ADMIN for PUT |
| `/management/analytics` | `hrGuard` (HR\|ADMIN) | `/api/hr/analytics` → HR\|ADMIN |

---

## 8. Known Gaps & Issues

### 🔴 Critical

| # | Issue | Location | Impact |
|---|---|---|---|
| 1 | **Hardcoded localhost URL** in interceptor | [`auth.interceptor.ts:13`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/frontend/src/app/core/auth/auth.interceptor.ts#L13-L15) | Token will never be sent to API in any non-local environment |
| 2 | **Client ID mismatch** | `environment.ts` says `leave-workforce-ui`; `app.config.ts` says `angular-app` | `environment.ts` is unused; the mismatch is confusing |

### 🟡 Medium

| # | Issue | Location | Impact |
|---|---|---|---|
| 3 | **`/dev/auth-test` has no guard** | [`app.routes.ts:69-71`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/frontend/src/app/app.routes.ts#L69-L71) | Dev component accessible to anyone — remove before production |
| 4 | **Manager routes only check `authenticated()`** | `SecurityConfig` + `ManagerController` | A plain `EMPLOYEE` can call manager approve/reject endpoints. Backend should verify the requesting user is actually the team manager. |
| 5 | **`disableNonceCheck: true`** | [`app.config.ts:32`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/frontend/src/app/app.config.ts#L32) | Weakens replay attack protection. OK for dev, not for production |
| 6 | **`strictDiscoveryDocumentValidation: false`** | [`app.config.ts:29`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/frontend/src/app/app.config.ts#L29) | Relaxed validation. OK for dev, not for production |
| 7 | **Swagger UI is public** | [`SecurityConfig.java:74-76`](file:///c:/Users/marj/IdeaProjects/Leave-Management-webapp-PFA/backend/src/main/java/com/stagepfa/demo/config/SecurityConfig.java#L74-L76) | API documentation exposed without auth — acceptable in dev, restrict in production |

### 🟢 Good practices already in place

- ✅ **PKCE enabled** on the Keycloak client (`pkce.code.challenge.method: S256`) — prevents authorization code interception attacks
- ✅ **Implicit flow disabled** — only Authorization Code flow allowed
- ✅ **Direct access grants disabled** — no password grant type
- ✅ **Stateless backend** — no server sessions, each request is independently verified
- ✅ **CSRF disabled correctly** — only safe when not using cookie-based auth
- ✅ **Token not leaked to third parties** — interceptor checks origin before attaching token
- ✅ **Dual-layer role enforcement** — Angular guards (UX) + Spring path rules + `@PreAuthorize` (real security)
- ✅ **Account pre-provisioning model** — users cannot self-register, HR must create accounts
- ✅ **First-login linking** — Keycloak subject linked to internal User record on first login without storing credentials

---

## Appendix: How to add a new secured endpoint

**Scenario**: You want a new endpoint `POST /api/hr/leave-types` that only HR/ADMIN can call.

**Step 1 — Controller**: Annotate the class or method:
```java
@RestController
@RequestMapping("/api/hr/leave-types")
@PreAuthorize("hasAnyRole('HR', 'ADMIN')")  // or on the method
public class LeaveTypeController { ... }
```

**Step 2 — SecurityConfig**: The path `/api/hr/**` is already covered by:
```java
.requestMatchers("/api/hr/**").hasAnyRole("HR", "ADMIN")
```
No change needed to `SecurityConfig` for new `/api/hr/` endpoints.

**Step 3 — Frontend**: Add a new route protected by `hrGuard` in `app.routes.ts`:
```typescript
{
  path: 'management/leave-types',
  loadComponent: () => import('./features/...').then(m => m.LeaveTypeComponent),
  canActivate: [hrGuard],
}
```

**Step 4 — Keycloak**: No change needed if `HR` and `ADMIN` roles already exist (they do).
