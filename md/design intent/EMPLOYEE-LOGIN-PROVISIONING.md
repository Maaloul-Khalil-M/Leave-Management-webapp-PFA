---
title: EMPLOYEE-LOGIN-PROVISIONING
lastUpdated: Sat, Sep 5 • 3:20 PM
created: Sun, Aug 30 • 7:21 AM
---
Employee Login & Provisioning — Step by Step

This document describes **how this repository works today** and **how provisioning should work** for the HR / Google / Keycloak model. It is based on the actual frontend, backend, Docker Compose, and Keycloak setup docs in the tree—not a generic IdP tutorial.

---

## Current Setup

### End-to-end Path

```
Angular SPA  --OIDC code+PKCE + kc_idp_hint=google-->  Keycloak (realm myrealm)
Keycloak     --broker-->  Google
Angular      --Authorization: Bearer <access token>-->  Spring Boot (resource server)
Spring Boot  --JWKS / issuer-uri-->  Keycloak
```

| Piece | Location / detail |
|--------|-------------------|
| SPA | `frontend/` — `angular-oauth2-oidc`, issuer `http://localhost:9090/realms/myrealm`, client `angular-app` (`app.config.ts`) |
| Login | `AuthService.loginWithGoogle()` forces Google via `kc_idp_hint: 'google'` |
| API | `backend/` — port **8081**, OAuth2 Resource Server (`application.yml` `issuer-uri`) |
| Keycloak | `docker-compose.yml` — image `quay.io/keycloak/keycloak:26.5`, port **9090**, admin `admin`/`admin` |
| Realm setup | **Not automated** — manual steps in `README.md` / `KEYCLOAK-UI-SETUP.md` |

There is **no** realm JSON export or realm-import in Compose. Client, Google IdP, roles, and browser flow are expected to be configured in the Admin Console.

### How Users Are Created Today

| System | When a row appears |
|--------|---------------------|
| **Keycloak** | On first successful Google login (broker). New employees are **not** pre-created in Keycloak by this app. |
| **`app_users`** | First call to `GET /api/v1/me` that sees a new JWT `sub` (`CurrentUserService.provision`) |
| **`employees`** | Seeded in `data.sql`, created by HR (`POST /api/v1/hr/employees`), or **auto-created as `PENDING`** if email is unknown at provision time |

Keycloak is **not** the source of the HR employee list. The app DB is.

### JWT Handling

- Angular stores the access token and sends it on API calls (`auth.interceptor.ts`).
- Spring validates the JWT as a resource server (`SecurityConfig` + `issuer-uri`).
- Stable identity claim used by the app: **`sub`** (Keycloak subject).
- Email is required for provisioning (`email` claim); missing email → 401.
- **Roles** are read from the token only:
  - Backend: `realm_access.roles` + `resource_access["angular-app"].roles` → `ROLE_*` (`SecurityConfig.extractAuthorities`)
  - Frontend: same claims in `AuthService.roles` / `MeResponse.roles`
- Application tables **do not** store roles.

### How Users and Employees Are Represented

**`employees`** (`schema.sql`, entity `Employee`) — HR master data:

- `id`, `email` (unique), `full_name`, `department`, `hired_at`, **`status`** (`PENDING` \| `ACTIVE`)

**`app_users`** (`AppUser`) — application identity bound to Keycloak:

- `id`, **`keycloak_subject`** (unique, = JWT `sub`), `email`, **`employee_id`** (nullable FK), `created_at`
- “Linked” means `employee_id != null` (`AppUser.isLinked()`)

**Access to normal work APIs** (e.g. `GET /api/v1/work`) requires a linked employee with **`status == ACTIVE`** (`CurrentUserService.requireActiveEmployee`).

### Relevant Keycloak Configuration (Manual)

From the repo docs (not enforced by code):

- Realm: **`myrealm`**
- Client **`angular-app`**: public, standard flow on, direct access grants **off**, PKCE S256, redirect/web origin `http://localhost:4200`
- Identity provider alias **`google`** (must match `kc_idp_hint`)
- Optional realm roles used by the API/UI: `USER`, `HR`, `ADMIN` (e.g. `@PreAuthorize("hasAnyRole('HR', 'ADMIN')")` on `HrController`)

Default roles for new federated users, if any, are a **Keycloak realm setting**—this codebase does not call the Keycloak Admin API to assign roles.

---

## The Problem

### What We Need

1. HR owns a spreadsheet of real employees (emails).
2. People sign in **only** with Google through Keycloak.
3. New hires should not need a manual Keycloak user.
4. The backend must map Keycloak identity → internal **employee**.
5. Authenticated people who are **not** employees (or not yet approved) must **not** get normal app access.

### Why Pre-creating Users in Keycloak is a Bad Fit

If operators **manually create** Keycloak users (or rely on an “account already exists” / password-style flow):

- You fight Google federation (duplicate usernames/emails, first-broker-login conflicts).
- HR data and IdP users drift out of sync.
- “Is this person an employee?” is answered in the wrong system.

This repo’s design direction is the opposite: **Keycloak only authenticates**; **employee membership and access live in the application DB**.

### What the Code Does Today Vs a Strict HR Gate

| Behavior | Current code |
|----------|----------------|
| First `/me` with known email | Links `app_users` to existing `employees` row |
| First `/me` with **unknown** email | **Creates** a `PENDING` employee and links (`provision`) |
| Work area | Blocked until `ACTIVE` |
| Pending UX | `/pending-setup` + `employeeGuard` (ACTIVE required) |

Auto-creating `PENDING` employees is convenient for demos but is a product choice: pure “HR must exist first” would **not** insert into `employees` and would leave the user unlinked (or linked only after HR import).

---

## Recommended Approach

```
HR spreadsheet → employees (app DB)
                      ↓
User → Google → Keycloak → JWT (sub, email, roles)
                      ↓
Backend → app_users (by sub) → employee_id → employees
                      ↓
Application access if employee exists and is ACTIVE
```

**Principle:** Keycloak authenticates the person; the **application database** decides whether they are an employee and what they may do (beyond coarse roles in the token).

| Owns | Responsibility |
|------|----------------|
| **Keycloak / Google** | Prove identity; issue JWT (`sub`, `email`, optional roles) |
| **Application DB** | Employee roster, link `sub` → `employee_id`, ACTIVE/PENDING (or “no row”), business data |
| **Angular** | Login, send Bearer token, show pending vs app based on `/api/v1/me` |

---

## Step 1 — Employee Provisioning

**Where HR data lives:** table **`employees`** (not Keycloak).

Today seeds are in `backend/src/main/resources/data.sql` (H2 `MERGE`). In production, replace with import from spreadsheet (batch job, admin upload, or `POST /api/v1/hr/employees` for single rows).

Minimal shape (already in `schema.sql`):

```text
employees(id, email UNIQUE, full_name, department, hired_at, status)
```

- Import HR list as **`ACTIVE`** (or a dedicated status if you prefer “invited”).
- Email is the join key to Google’s email claim on first login.

---

## Step 2 — First Google Login

1. User clicks **Continue with Google** → `AuthService.loginWithGoogle()`.
2. Keycloak runs browser flow with Google IdP; **no** app-side password.
3. Keycloak creates/updates its user from Google and returns tokens to the SPA.
4. SPA calls backend with the access token (e.g. `MeService.loadMe()` → `GET /api/v1/me`).

No Keycloak Admin API is required for normal employees.

---

## Step 3 — Link Keycloak Identity to Employee

Implemented in `CurrentUserService`:

1. Read JWT **`sub`** and **`email`**.
2. Find `app_users` by `keycloak_subject`; if missing, **provision**:
   - Find `employees` by email (case-insensitive).
   - If found → set `employee_id`.
   - Create `AppUser` with that `sub` / email / `employee_id`.
3. Return `MeResponse` (linked flag, employee fields, status, roles from security context).

Conceptual flow (matches current service):

```text
sub, email ← JWT
user ← app_users by sub
if missing:
  employee ← employees by email
  if no employee:
    // policy choice: PENDING row (current) OR refuse link (stricter HR-only)
  user ← insert app_users(sub, email, employee.id)
return me(user, employee, roles from JWT)
```

Stable key is always **`sub`**, not email alone (email can change; `sub` does not for that Keycloak user).

---

## Step 4 — Pending Users

**Policy A (current code):** unknown email → auto `PENDING` employee → linked but not ACTIVE → no `/api/v1/work`.

**Policy B (stricter HR list):** unknown email → `app_users` with `employee_id = null` (or no auto employee) → not linked → same UX, no phantom HR rows.

Either way, UI should not treat “has JWT” as “has app access.”

**Frontend (this repo):**

- Route: `pending-setup` — `PendingSetupComponent` (`authGuard` only).
- Copy already matches the intent: signed in, account not ready / PENDING, contact HR.
- `employeeGuard`: requires `linked && employeeStatus === 'ACTIVE'`; otherwise redirects to `/pending-setup`.
- Home shows status from `/api/v1/me` and can navigate to pending.

Suggested message (already close to the pending page):

> You're signed in, but your account isn't set up yet. Please contact HR or IT.

Wire guarded feature routes with `employeeGuard` when you add real app areas beyond the demo home page.

---

## Step 5 — HR / Admin Flow

**HR adds employee before first login:** insert `ACTIVE` row (seed, import, or `HrController` `POST /api/v1/hr/employees`). First `/me` links by email.

**Person logged in first (PENDING or unlinked), HR acts later:**

- **Activate** pending row: `POST /api/v1/hr/employees/{id}/activate` (`EmployeeAdminService.activateEmployee`).
- **Create ACTIVE** for that email: create/promote employee; service also **auto-links** `app_users` with the same email when creating (`createActiveEmployee`).
- Admin-only helpers still exist under `/api/v1/admin` (e.g. manual `link`, `auto-link-by-email`) for `ADMIN` role.

After link/activate, user calls `/me` again (or refreshes); work area succeeds once status is `ACTIVE`.

UI for HR: Angular route `/hr` (`hrGuard` → roles `HR` or `ADMIN` in JWT).

---

## Step 6 — Roles and Permissions

**What the repository does:** roles stay in **Keycloak** and travel in the **access token**. Spring method security (`hasRole` / `hasAnyRole`) and the Angular HR guard both trust those claims.

**Implications:**

- Changing roles in Keycloak requires a **new token** (re-login or refresh) before API/UI see them.
- Fine-grained “is employee / is active” is **not** a Keycloak role in this design—it is **`employees.status` + `app_users.employee_id`**.
- Optional: keep only coarse roles in Keycloak (`HR`, `ADMIN`) and keep employment state in the app DB (current split).

If you later move authorization fully into the app DB, you would stop relying on `realm_access` for business rules; that is **not** how the code works today.

---

## Migration

From a password / pre-created-Keycloak-user mindset to this model:

1. **Keycloak:** Ensure Google IdP + public SPA client; turn off password/direct grants for the employee login path; do not bulk-create employee passwords in Keycloak.
2. **Employees:** Load HR spreadsheet into `employees` (`ACTIVE`). Keep or replace `data.sql` seeds.
3. **Existing Keycloak users (Google-linked):** Leave them. On next `/me`, provision `app_users` by `sub` and link by email if a row exists.
4. **Orphan Keycloak users (no employee email):** They authenticate but stay pending/unlinked until HR adds/activates an employee—or you delete IdP users if policy requires.
5. **App data:** Empty `app_users` until first real login is expected. Do not backfill Keycloak into `app_users` without a real `sub`.
6. **Roles:** Assign `HR` / `ADMIN` in Keycloak only to operators; configure default realm roles only if you need a baseline (e.g. `USER`).
7. **Policy decision:** Keep auto-`PENDING` employee creation or switch `provision` to “link only if HR row exists” for stricter control.

---

## Final Flow

```text
HR spreadsheet
      │
      ▼
 employees (app DB, status ACTIVE|PENDING)
      │
      │  (email match on first API call)
      │
User ──► Google ──► Keycloak ──► JWT (sub, email, roles)
                                      │
                                      ▼
                              Spring resource server
                                      │
                                      ▼
                               app_users (by sub)
                                      │
                                      ▼
                               employee_id ──► employees
                                      │
                                      ▼
                         ACTIVE? ──yes──► application access
                              │
                              no ──► pending / contact HR
```

### Old Vs New

| | Old / problematic | Target (this architecture) |
|--|-------------------|----------------------------|
| Employee list | Keycloak users or ad hoc | `employees` from HR |
| First-time hire | Manual Keycloak user | Google login only; Keycloak user via broker |
| App identity | Often = IdP username | `app_users.keycloak_subject` = JWT `sub` |
| Authorization to work | “Can log into Keycloak” | Linked + **ACTIVE** employee |
| Unknown Google account | Confusing IdP errors or full access | Authenticated but pending / no work access |
| Roles | Mixed | Coarse roles in Keycloak JWT; employment in app DB |

---

## File Map (Quick rEference)

| Concern | Primary files |
|---------|----------------|
| Provision + link | `CurrentUserService.java` |
| Schema | `schema.sql`, `data.sql` |
| JWT / roles | `SecurityConfig.java`, `AuthService` |
| Me API | `MeController.java`, `MeResponse.java` |
| Work gate | `ApiController` `/api/v1/work`, `requireActiveEmployee` |
| HR API | `HrController.java`, `EmployeeAdminService.java` |
| Pending UI | `pending/pending-setup.component.*`, `employee.guard.ts` |
| Login | `auth.service.ts`, `app.config.ts` |
| Keycloak process | `docker-compose.yml`, `README.md`, `KEYCLOAK-UI-SETUP.md` |

Realm, Google client IDs/secrets, and default roles are **not** fully defined in code—only documented as manual Admin Console steps.
