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
| Leave ledger (append-only) | Working | Service with appendMovement logic; leave request approval triggers ledger debits when leave type deducts balance |
| Leave request state machine | Working | Draft creation, listing, submit (DRAFT → PENDING), manager decision (PENDING → APPROVED / REJECTED), and employee cancellation (DRAFT/PENDING/APPROVED → CANCELLED with compensating ledger credit for deductible leaves) implemented |
| Manager-of authorization | Working | Enforced on manager approval and rejection endpoints via Employee.currentManager |
| Eligibility service | Missing | Does not exist |
| Domain events → notifications | Working | LeaveRequestEvent triggers in-app Notification persistence and MailHog HTML email delivery for submit/approve/reject/cancel |
| Keycloak JWT resource server | Working | Implemented via `SecurityConfig` and `CurrentUserServiceImpl` |
| Global exception handler + error envelope | Working | Present in `exception/` |
| Migrations (Mongock / Flamingock) | Working | Present under `migrations/` |
| Calendar affecting duration | Missing | |

---

## Frontend

| Area | Status | Notes |
|------|--------|-------|
| Auth (Keycloak / Google hint) | Working | Centralized minimal login at `/login`, Google OIDC code flow, and RP-initiated logout with `id_token_hint` / `client_id` fallback |
| Shell / layout / theme | Working | Platana header, responsive dashboard layout, clean routing |
| Employee Dashboard (`/dashboard`) | Working | Real-data employee first screen. Paid Annual circular gauge + compact cards for Sick/Unpaid/Maternity, balance calculation, recent requests, leave ledger movements, upcoming approved leaves, company holidays (paged at 3), and compact FullCalendar. |
| Employee leave request UI | Working | Draft creation, listing, submit action on DRAFT, cancel action on DRAFT/PENDING/APPROVED (both on /dashboard and /leave-requests), and clear status badges |
| Manager approval UI | Working | Team pending leave requests queue at /manager/approvals with Approve (optional comment) and Reject (required comment) |
| In-app Notifications UI | Working | Notification bell with unread badge counter in header, dropdown list with status styling and relative timestamps, click-to-mark-read via real API |
| HR & Admin screens (employees, departments, positions, calendars, settings) | Working | Complete workforce directory, CSV import/export, master data, calendar & special days CRUD, and company settings at /management/** |
| HR screens (policies, adjustments) | Missing | Leave policies and balance adjustments UI |
| Pending / ACTIVE gating | Working | Non-ACTIVE or missing employee profiles redirected cleanly to `/no-profile` holding screen with logout action |
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

### Centralized Login Screen & Sign-Out Bugfix — 2026-09-17
- **Centralized Login Experience**:
  - Implemented standalone `LoginComponent` at `/login` with embedded `<app-header />`, clean brand card, and a single "Continue with Google" button triggering `auth.loginWithGoogle()`.
  - Automatically redirects authenticated users accessing `/login` straight to `/dashboard`.
  - Updated `employeeGuard` and `hrGuard` to redirect unauthenticated visitors cleanly to `/login` rather than executing immediate `initCodeFlow` redirects in route guards.
- **Header Auth-Aware Integration**:
  - Updated `HeaderComponent` template to gate navigation links, notification bell, request leave action, and user profile menu with `@if (auth.isLoggedIn())`, while preserving brand logo and theme switcher.
- **Sign-Out Fix (`id_token_hint`)**:
  - Corrected `AuthService.logout()` to supply `{ id_token_hint: idToken }` when present and `{ client_id: clientId }` as fallback, satisfying Keycloak 26.5 RP-Initiated Logout specification requirements and resolving `Missing parameters: id_token_hint`.
- **Verification**:
  - Added unit test suite `auth.service.spec.ts` (32/32 tests passing across suite).
  - Production build completed with 0 errors.

### Leave Request Cancellation — 2026-09-17
- **Backend Service & State Machine**:
  - Implemented `LeaveRequestService.cancel(String id, String reason)`:
    - Enforces owner-only authorization via `currentUserService.requireLinkedUser()` matching `leaveRequest.getEmployeeId()`.
    - Allows transitions from `DRAFT`, `PENDING`, and `APPROVED` to `CANCELLED`.
    - Rejects invalid transitions (e.g., from `REJECTED` or `CANCELLED`) with `BusinessException(ErrorCode.INVALID_STATUS_TRANSITION)`.
    - When cancelling an `APPROVED` request whose `LeaveType` has `deductsFromBalance = true`, appends a compensating `LedgerMovement` of type `CANCELLED_LEAVE_CREDIT` via `LeaveLedgerService.appendMovement(...)`.
    - Updates `LeaveLedgerServiceImpl.applyCredit` to reduce `consumedBalance` and credit `availableBalance` upon `CANCELLED_LEAVE_CREDIT`.
    - Appends `StatusHistoryEntry` (`fromStatus`, `toStatus = CANCELLED`, `byUserId`, `comment`).
    - Dispatches domain event `LeaveRequestEvent`.
- **Backend Controller & DTOs**:
  - Added `CancelLeaveRequest` DTO with optional `reason`.
  - Exposed `POST /api/employee/leave-requests/{id}/cancel` in `EmployeeLeaveRequestController`.
- **Notifications & Email**:
  - Extended `NotificationType` with `LEAVE_CANCELLED`.
  - Added `EmailService` status color for `CANCELLED`.
  - Updated `NotificationServiceImpl` to notify managers (in-app and via MailHog HTML email) when an employee cancels a `PENDING` or `APPROVED` request.
- **Frontend Integration**:
  - Extended `LeaveRequestService` (`leave-request.service.ts`) with `cancel(id, reason)`.
  - In `LeaveRequestsComponent` (`/leave-requests`): added "Cancel" action button in the requests history table for items in `DRAFT`, `PENDING`, or `APPROVED` status with confirmation and error handling.
  - In `RecentRequestsComponent` (`/dashboard`): added compact "Cancel" button for requests in `Draft`, `Pending`, or `Approved` status, with automatic dashboard state and balance refresh. Added `.status-chip.cancelled` badge styling.
- **Verification**:
  - Added unit test suite `LeaveRequestCancelTest` (9/9 tests passing) and `LeaveLedgerServiceTest` (1/1 test passing).
  - Extended `NotificationServiceTest` covering cancellation event handling (8/8 tests passing).
  - All 38 backend tests passing (`BUILD SUCCESS`).
  - Frontend test suite passing 18/18 tests (`npx vitest run`).
  - Angular production build (`npm run build`) completed with 0 errors.

### Organization Settings & Work Calendars — Slice M3 (Settings & Calendar Days CRUD) — 2026-09-17
- **Services & Backend Integration**:
  - Implemented `CalendarAdminService` (`calendar-admin.service.ts`) wired to all `/api/calendars` and nested `/api/calendars/{calendarId}/days` endpoints for full CRUD (create, read, update, delete).
  - Extended `OrganizationService` (`organization.service.ts`) with `getSettings()` (`GET /api/organization-settings`) and `updateSettings(req)` (`PUT /api/organization-settings`).
- **UI & UX Flow (`/management/organization`)**:
  - Expanded `OrganizationManagementComponent` to 4 clean tabs: **Departments**, **Job Positions**, **Work Calendars**, and **Company Settings**.
  - **Work Calendars & Special Days Tab**:
    - Calendar cards listing code, country jurisdiction, year, and name.
    - Calendar CRUD modals: Add Calendar, Edit Calendar, and Delete Calendar (with cascade warning).
    - Selected calendar schedule view: DayType filter (`ALL`, `PUBLIC_HOLIDAY`, `SPECIAL_NON_WORKING_DAY`, `SPECIAL_WORKING_DAY`), special days table with type indicators.
    - Day CRUD modals: Add Special Day/Holiday, Edit Day, and Delete Day.
  - **Company Settings Tab**:
    - Settings overview card displaying company name, jurisdiction, weekend schedule badges, and metadata.
    - Edit Settings modal with company name input, country selector (`TN` / `FR`), and day-of-week checkboxes (Monday=1 to Sunday=7).
- **Verification**:
  - Production build `ng build` completed successfully with 0 errors.
  - Test suite `npx vitest run` passing 11/11 tests.

### Employee CSV Support — Slice M2 (CSV Export & 3-Step Import Wizard) — 2026-09-17
- **CSV Utilities & Engine**:
  - Implemented zero-dependency, RFC 4180 compliant CSV parser and stringifier (`csv-parser.ts`) handling quoted cells, embedded commas, newlines, and escaped quotes. Covered with 5/5 passing unit tests.
  - Implemented `EmployeeCsvService` (`employee-csv.service.ts`):
    - `buildTemplateCsv`: Generates import template pre-populated with live system departments and job positions.
    - `exportEmployeesCsv`: Exports current or filtered workforce directory into clean CSV format.
    - `parseAndValidate`: Performs multi-tier validation (column presence, email regex, date formats, internal CSV uniqueness, and database uniqueness against loaded employees).
    - `executeImport`: Progressively posts validated employees to `/api/hr/employees` via `EmployeeAdminService.createEmployee`.
- **UI & UX Flow (`/management/employees`)**:
  - Added "Export CSV" and "Import CSV" actions to the directory toolbar.
  - Implemented `EmployeeImportDialogComponent` featuring the 3-step wizard:
    - **Step 1 (Upload)**: Drag-and-drop dropzone, file input, and single-click template download.
    - **Step 2 (Review)**: Summary card (valid count vs. error count), preview table capped at 20 rows with toggle, and itemized inline error badges per row.
    - **Step 3 (Success)**: Batch summary reporting imported count, skipped count, and server-side errors, with direct return to the refreshed employee directory.
- **Verification**:
  - `npx vitest run` passed 11/11 tests across the frontend suite.
  - `ng build` completed successfully with 0 errors.

### Higher-Level Management UI — Slice M1 (Employees, Departments, Positions CRUD) — 2026-09-17
- **Route Guarding & Permissions**:
  - Implemented `hrGuard` (`frontend/src/app/core/auth/hr.guard.ts`) restricting `/management/**` routes to users with `HR` or `ADMIN` roles.
  - Header navigation dynamically displays "Employees" and "Organization" links only when authenticated user holds `HR` or `ADMIN` roles.
- **Organization Master Data (`/management/organization`)**:
  - Implemented `OrganizationService` wired to `/api/departments` and `/api/positions`.
  - Implemented `OrganizationManagementComponent` featuring:
    - Tabbed view for Departments and Job Positions.
    - Department creation modal (`POST /api/departments`).
    - Position creation and editing modals (`POST /api/positions`, `PATCH /api/positions/{id}`) with department selector.
- **Employee Directory & Contract/Tenure Management (`/management/employees`)**:
  - Implemented `EmployeeAdminService` wired to `/api/hr/employees` (`GET /`, `GET /{id}`, `POST /`, `PATCH /{id}`).
  - Implemented `EmployeeManagementComponent` featuring:
    - Summary metrics (total workforce, active contracts, departments count).
    - Status filtering (`ALL`, `ACTIVE`, `SUSPENDED`, `TERMINATED`) and multi-attribute search (name, email, employee number, position).
    - New employee creation modal with profile data, initial assignment (department/position selector and start date), and manager selection.
    - Employee edit and contract transfer modal: update employment status, contact details, manager, and assign new position/department with audit trail.
- **Verification**:
  - Production build `ng build` succeeded with 0 errors.
  - All 27 backend tests passing.

### Notifications — Slice N2 (In-App Notification Bell & Dropdown UI) — 2026-09-17
- **Component Architecture**:
  - Implemented `NotificationBellComponent` at `frontend/src/app/core/layout/notification-bell/`:
    - Material icon bell button with `matBadge` (warn red badge displaying unread count when > 0) and `matTooltip`.
    - Dropdown overlay panel using `mat-menu` with custom 360px panel styling.
    - Notification list rows with status-themed icons (`check_circle` for success, `cancel` for error, `info` for info, `schedule` for pending).
    - Unread indicator styling with distinct background tint.
    - Relative timestamp pipe (`RelativeTimePipe`) providing relative time labels ("Just now", "5m ago", "2h ago", "Yesterday").
    - Clean empty state ("You're all caught up.") when no notifications are present.
    - Footer button "See all activity" routing to `/leave-requests`.
- **Frontend Service & API Integration**:
  - Created `NotificationService` in `frontend/src/app/core/services/notification.service.ts` wired to `GET http://localhost:8080/api/notifications` and `POST http://localhost:8080/api/notifications/{id}/read`.
  - Type mappings between backend `NotificationResponse` and UI `NotificationItem`.
- **Header Integration**:
  - Embedded `app-notification-bell` in `HeaderComponent` (`frontend/src/app/features/dashboard/components/header/header.component.html`) inside `.header-actions`.
  - Auto-loads notifications on header initialization; clicking an unread item immediately calls the backend to mark it read and decreases the badge count.
- **Verification**:
  - Angular production build (`ng build`) completed with 0 errors.
  - Backend unit tests (`mvnw test -Dtest=NotificationServiceTest`) 7/7 tests passing.

### Notifications (In-App Persistence & MailHog Formatted Email) — 2026-09-17
- **Domain Event Architecture**:
  - Defined `LeaveRequestEvent` domain record published by `LeaveRequestServiceImpl` on `submit`, `approve`, and `reject`.
  - Created `LeaveRequestNotificationListener` that handles events asynchronously/decoupled, ensuring failures in notifications or mail never disrupt the leave transaction.
- **In-App Notification Storage**:
  - Implemented `Notification` entity (`recipientUserId`, `recipientEmployeeId`, `title`, `message`, `type`, `read`, `leaveRequestId`, `createdAt`).
  - Added `NotificationRepository` and `NotificationService` supporting in-app persistence, listing for the authenticated user (`listMyNotifications`), and marking notifications as read (`markAsRead`).
  - Exposed `GET /api/notifications` and `POST /api/notifications/{id}/read` in `NotificationController`.
- **MailHog Formatted HTML Emails**:
  - Implemented `EmailService` using Spring Boot's `JavaMailSender` and MIME multipart HTML templates.
  - Sends branded emails with detailed event summaries (employee, leave type, period, duration, status badge, and notes/reasons) to MailHog SMTP at `localhost:1025`.
  - Supports clean fallbacks: if an employee or manager lacks an email address or unassigned manager, email delivery is cleanly skipped and logged.
- **Verification**:
  - Added unit test suite `NotificationServiceTest` covering submit, approve, reject, unassigned manager, mark-as-read, and security ownership checks (7/7 tests passing).
  - All 27 backend tests across the application passing (`BUILD SUCCESS`).

### Leave Request Workflow — Slice C (Employee + Manager UI) — 2026-09-16
- **Backend API**:
  - Implemented `LeaveRequestService.listPendingTeamRequests()` and exposed `GET /api/manager/leave-requests/pending` on `ManagerLeaveRequestController` returning direct reports' pending requests.
  - Added unit test in `LeaveRequestDecisionTest` verifying direct report resolution and pending status filtering.
- **Frontend Employee Experience**:
  - Extended `LeaveRequestService` with `submit`, `listPendingTeamRequests`, `approve`, and `reject`.
  - Added direct "Submit" action button on `DRAFT` items within `/leave-requests` and `/dashboard` (Recent Requests widget), dynamically refreshing balances and lists upon submission.
  - Ensured clear, accessible status indicators for `DRAFT` (amber), `PENDING` (blue), `APPROVED` (emerald), and `REJECTED` (rose).
- **Frontend Manager Experience**:
  - Implemented `ManagerApprovalsComponent` at `/manager/approvals`:
    - Displays pending leave requests submitted by direct reports with employee snapshot metadata, leave details, duration, and reason.
    - Inline approval workflow with optional comment.
    - Inline rejection workflow with required comment validation.
    - Connected to real backend endpoints (`/api/manager/leave-requests/{id}/approve` and `/reject`).
  - Added "Approvals" navigation entry in header and mobile menus.
- **Verification**:
  - Backend tests: 16/16 passed (`BUILD SUCCESS`).
  - Frontend production build: `npm run build` completed with 0 errors.

### Leave Request Workflow — Slice B (Manager Approve/Reject) — 2026-09-16
- **Backend Service**:
  - Implemented `LeaveRequestService.approve(String id, String comment)`:
    - Enforces manager-of authorization (`requester.getCurrentManager().getEmployeeId().equals(managerEmployeeId)`), forbids self-approval, requires `PENDING` status.
    - Checks whether `LeaveType.deductsFromBalance` is true. If true, debits leave ledger via `LeaveLedgerService.appendMovement(APPROVED_LEAVE_DEBIT)` and rolls back if `INSUFFICIENT_BALANCE`. If false (e.g. `SICK`), skips ledger debit.
    - Transitions status to `APPROVED`, records `validatedAt`, `validatedBy`, and `validationComment`, and appends history entry.
  - Implemented `LeaveRequestService.reject(String id, String comment)`:
    - Enforces manager-of check, forbids self-rejection, requires `PENDING` status, and requires non-blank comment (`ErrorCode.VALIDATION_ERROR`).
    - Transitions status to `REJECTED`, records `validationComment`, appends history, and performs no ledger movements.
- **Backend Controller & DTOs**:
  - Added `ApproveLeaveRequest` (optional comment) and `RejectLeaveRequest` (`@NotBlank` comment).
  - Created `ManagerLeaveRequestController` with `POST /api/manager/leave-requests/{id}/approve` and `POST /api/manager/leave-requests/{id}/reject`.
- **Verification**:
  - Created `LeaveRequestDecisionTest` covering 10 test scenarios (balance debit on approval, no debit for non-deductible types, manager-of enforcement, self-approval/rejection guards, non-pending status guards, insufficient balance rollback, reject comment requirement, and history auditing). All 18 tests passing.

### Leave Request Workflow — Slice A (Submit DRAFT → PENDING) — 2026-09-16
- **Backend Service**:
  - Implemented `LeaveRequestService.submit(String id)`:
    - Verifies authenticated employee ownership (`BusinessException(ErrorCode.FORBIDDEN)` if unlinked or not owner).
    - Checks request exists (`ResourceNotFoundException(ErrorCode.RESOURCE_NOT_FOUND)` if not found).
    - Enforces state transition guard (`leaveRequest.getStatus() == LeaveRequestStatus.DRAFT`, throws `BusinessException(ErrorCode.INVALID_STATUS_TRANSITION)` otherwise).
    - Sets `status = PENDING`, records `submittedAt = Instant.now()`, and appends a `StatusHistoryEntry` (`fromStatus = DRAFT`, `toStatus = PENDING`, with user ID and timestamp).
- **Backend Controller**:
  - Exposed `POST /api/employee/leave-requests/{id}/submit` on `EmployeeLeaveRequestController` returning `200 OK` with `LeaveRequestResponse`.
- **Verification**:
  - Added unit test suite `LeaveRequestSubmitTest` covering success, not found, forbidden (non-owner), invalid status transitions, and unlinked user scenarios (5/5 tests passing).

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
