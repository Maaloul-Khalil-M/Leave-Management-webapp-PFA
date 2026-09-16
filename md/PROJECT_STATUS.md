# PROJECT_STATUS
### Living status of the Leave & Workforce application

Update this file when something moves from Incomplete → Working, or when a new gap is discovered.

---

## Legend
- **Working** — implemented and verified at least once
- **Partial** — exists but incomplete or not fully wired
- **Missing** — not present in the live tree (or only in design docs)
- **Unknown** — needs verification against the current checkout
- **Broken** — present but failing

---

## Backend

| Area | Status | Notes |
|------|--------|-------|
| Layered structure (controller / service / repo / DTO / mapper) | Working | Present in live trees under `com.stagepfa.demo` |
| Actor-based controllers (`me` / `manager` / `hr` / `admin`) | Partial | Admin, employee, hr, manager packages exist. Not all endpoints implemented. |
| Reference data (departments, positions, leave types, org settings) | Working | Migrations and endpoints exist for CRUD |
| Users & Employees separation | Working | MongoDB models `User` and `Employee` exist and link via `employeeId` |
| Leave ledger (append-only) | Partial | Service exists with `appendMovement` logic, but no leave request triggers it |
| Leave request state machine | Partial | Draft creation and listing implemented; submit/approve/reject workflows pending |
| Manager-of authorization | Missing | Not implemented for leave requests |
| Eligibility service | Missing | Does not exist |
| Domain events → notifications | Missing | No events or notifications implemented |
| Keycloak JWT resource server | Working | Implemented via `SecurityConfig` and `CurrentUserServiceImpl` |
| Global exception handler + error envelope | Working | Present in `exception/` |
| Migrations (Mongock / Flamingock) | Working | Present under `migrations/` |
| Calendar affecting duration | Missing | |

---

## Frontend

| Area | Status | Notes |
|------|--------|-------|
| Auth (Keycloak / Google hint) | Unknown | Not verified |
| Shell / layout / theme | Working | Platana header, responsive dashboard layout, clean routing |
| Employee Dashboard (`/dashboard`) | Working | Real-data employee first screen. Paid Annual circular gauge + compact cards for Sick/Unpaid/Maternity, balance calculation, recent requests, leave ledger movements, upcoming approved leaves, company holidays (paged at 3), and compact FullCalendar. |
| Employee leave request UI | Working | `LeaveRequestsComponent` implemented under `/leave-requests` |
| Manager approval UI | Missing | |
| HR screens (employees, policies, adjustments) | Missing | |
| Pending / ACTIVE gating | Missing | |
| Two colour systems (lifecycle vs availability) | Missing | |

---

## Infrastructure

| Area | Status | Notes |
|------|--------|-------|
| Docker Compose (Mongo, Keycloak, MailHog) | Working | |
| Keycloak realm automation | Manual | Relies on manual configuration |
| One-command demo seed | Partial | Flamingock migrations seed demo data |

---

## Cross-cutting gaps to track

1. Design docs (`ARCHITECTURE.md`, `CODEBASE_GUIDE.md`) use `com.acme.leave` but codebase uses `com.stagepfa.demo`.
2. `EMPLOYEE-LOGIN-PROVISIONING.md` describes an SQL stack (H2, `schema.sql`) but codebase is MongoDB.
3. Role source of truth (JWT claims mapped in `SecurityConfig`).

---

## Recently changed

### Employee Dashboard Alignment & Frontend Cleanup — 2026-09-16
- **Routing & First Screen**:
  - Root route (`/`) now redirects authenticated employees straight to `/dashboard` (primary employee landing screen).
  - Cleaned `employeeGuard` to trigger Keycloak code flow directly without disruptive browser alert popups.
  - Demoted debug token view to `/dev/auth-test`.
- **Component Cleanup & Refinements**:
  - **Leave Balances**: Paid Annual (`PAID_ANNUAL`) features an animated circular SVG gauge showing remaining vs. accrued/max balance; other types (`SICK`, `UNPAID`, `MATERNITY`) render as clean, compact stat cards with policy pills and usage counters.
  - **Upcoming Approved Leaves**: Strictly displays future approved leave requests from real data.
  - **Company Holidays**: Paginated at 3 items per page with sleek next/prev controls, pulling real Tunisian holidays.
  - **Compact FullCalendar**: Configured as a small, compact widget (310px height) merging official holidays, approved leaves, and pending drafts.
  - **Leave History & Ledger**: Full movements history (accruals, debits, adjustments) from backend ledger.
  - **Deleted Bloat/Stubs**: Completely removed fake `team-on-leave` (mock members), fake `attendance` toggle, and redundant `leave-utilization` chart.
- **Verification**: Built and verified production bundle via `npm run build` (0 errors).

### Employee Leave Request Foundation — 2026-09-16
- **Backend**:
  - Implemented `CreateLeaveRequest` DTO with validation.
  - Implemented `LeaveRequestService` and `LeaveRequestServiceImpl`:
    - `createDraft`: Calculates duration days based on company weekend rules, creates initial `DRAFT` status history, creates `EmployeeSnapshot`, and stores `LeaveRequest` in MongoDB. Does not debit leave ledger.
    - `listMine`: Returns all leave requests belonging to the authenticated employee.
  - Implemented `EmployeeLeaveRequestController` with `POST /api/employee/leave-requests` (201 Created) and `GET /api/employee/leave-requests` (PageResponse).
- **Frontend**:
  - Implemented `LeaveRequestService` for API calls.
  - Implemented `LeaveRequestsComponent` featuring a draft creation form and a list of the employee's requests with status and duration badges.
  - Enabled routing in `app.ts` via `<router-outlet/>` and registered `/leave-requests` with `employeeGuard` in `app.routes.ts`.
  - Added navigation links from `HomeComponent` header and action panel to `/leave-requests`.
- **Verification**: Backend compiled and passed tests (`mvnw test`); frontend compiled successfully (`npm run build`).

### Security Baseline Authorization — 2026-09-16
- **Endpoint Protection**: Cleaned up `SecurityConfig.java` to remove open `permitAll()` rules on `/api/employee/**`, `/api/calendars/**`, and `/api/test`.
- **Actor Namespace Rules**: Added URL-level authorization rules in `SecurityConfig.java`:
  - `/api/admin/**` -> `hasRole('ADMIN')`
  - `/api/hr/**` -> `hasAnyRole('HR', 'ADMIN')`
  - `/api/employee/**` and `/api/manager/**` -> `authenticated()`
  - Read access to reference data (`/api/departments/**`, `/api/positions/**`, `/api/calendars/**`, `/api/organization-settings/**`) -> `authenticated()`
- **Method-Level Security**:
  - `EmployeesController` and `LeavePolicyController`: Annotated with class-level `@PreAuthorize("hasAnyRole('HR', 'ADMIN')")`.
  - `UserController`: Annotated with class-level `@PreAuthorize("hasRole('ADMIN')")`.
  - `OrganizationSettingsController`: Fixed `GET` to `@PreAuthorize("isAuthenticated()")` and restricted `PUT` to `@PreAuthorize("hasRole('ADMIN')")`.
  - `DepartmentController` and `PositionController`: Added `@PreAuthorize("hasAnyRole('HR', 'ADMIN')")` on mutating endpoints (`POST`, `PATCH`).
  - `CalendarController`: Added `@PreAuthorize("hasRole('ADMIN')")` on all calendar and day mutating endpoints (`POST`, `PUT`, `DELETE`).
- **Verification**: Verified via `mvnw test-compile` and full test suite run `mvnw test` (all tests passing).

### Codebase Investigation — 2026-09-16
**Verified Repository Facts:**
- The root backend package is `com.stagepfa.demo`.
- The database is MongoDB with Flamingock migrations. There is no SQL/H2 database as stated in `EMPLOYEE-LOGIN-PROVISIONING.md`.
- Keycloak JWT validation is implemented via `SecurityConfig.java`, mapping Keycloak roles to Spring `GrantedAuthority`.
- `CurrentUserServiceImpl.java` parses Keycloak JWT `sub` and `email` to lookup the `User` identity, contradicting the dev header `X-User-Email` design described in `ARCHITECTURE.md`.
- Frontend is an Angular 22.1 workspace with a barebones `HomeComponent` and no feature routes (`app.routes.ts` is almost empty).

**LeaveRequest Findings:**
- **Entity**: `LeaveRequest` and `LeaveRequestStatus` enum exist in `domain/entities` and `domain/enums`.
- **Repository**: `LeaveRequestRepository` exists.
- **DTO/Mapper**: `LeaveRequestResponse` DTO and `LeaveRequestMapper` exist.
- **Missing components**: `LeaveRequestService`, `LeaveRequestController`, `EligibilityService`, and `AvailabilityService` do not exist anywhere in the repository. There is no code that creates, submits, approves, rejects, or cancels a leave request.

**LeaveLedger and LeaveAccrual Findings:**
- `LeaveLedgerServiceImpl.java` is implemented. It contains `appendMovement(String employeeId, String leaveTypeCode, int year, LedgerMovement movement)` and `adjust` for HR.
- `LeaveAccrualServiceImpl.java` is implemented. It provides `accrueForMonth(LocalDate asOf)`, which iterates over employees, resolves policies, checks balance caps, and creates a `LedgerMovementType.MONTHLY_ACCRUAL` movement by calling `leaveLedgerService.appendMovement`.
- `MonthlyLeaveAccrualJob.java` triggers `accrueForMonth` via a `@Scheduled` cron job at 2 AM on the 1st of every month.
- **Trigger gap**: `appendMovement` is never called by a Leave Request workflow (since the workflow doesn't exist).
- **User-facing entry points**: `EmployeeLeaveLedgerController.java` exposes GET endpoints to list ledgers for the current employee, but there are no endpoints to manually trigger an accrual job or submit leaves that deduct balance.

**Missing/Partial Functionality:**
- `LeaveRequest` state transitions (Submit, Approve, Reject).
- `Attendance` tracking (Documented, absent).
- `Notification` system (Documented, absent).

**Discrepancies with Design Intent:**
- `CODEBASE_GUIDE.md` details `EligibilityService`, `AvailabilityService`, and the `LeaveRequest` submit/approve workflows. These are entirely absent from the code.
- `EMPLOYEE-LOGIN-PROVISIONING.md` specifies SQL tables and frontend guards (`employeeGuard`, `/pending-setup`). The backend is MongoDB, and the frontend guards do not exist.

**Technical Risks & Inconsistencies:**
- The core leave workflow (Submit, Approve, Reject) is completely missing, meaning the primary functionality of the application is not implemented yet.
- The SQL vs MongoDB discrepancy in the design docs will cause developer confusion.

---

## Needs verification
- Keycloak Client and Realm configuration (currently relies on manual steps via Keycloak Admin UI).
