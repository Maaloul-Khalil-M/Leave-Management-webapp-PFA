---
title: DESIGN-DEV-README
lastUpdated: Tue, Sep 1 • 4:58 PM
created: Mon, Aug 17 • 1:12 AM
---
HR Leave Management — Design ↔ Development Agreement

## 1. Shared Foundations

| Foundation | Decision |
|---|---|
| Component library | Angular Material 3 (M3). Designer works from an M3-aligned Figma kit — the community [Material 3 Design Kit](https://www.figma.com/community/file/1035203688168086460) is the closest match to what ships in `@angular/material`. |
| Icon set | Material Symbols ([fonts.google.com/icons](https://fonts.google.com/icons)) — used via `mat-icon`. Don't mix in Lucide/Feather etc.; stroke-width mismatches are the fastest way to make an app look assembled instead of designed. |
| Breakpoints | Mobile ≤599px · Tablet 600–959px · Desktop ≥960px, aligned to Angular CDK's `Breakpoints.Small/Medium/Large` (confirm exact values against your installed CDK version in [material.angular.dev/cdk/layout/overview](https://material.angular.dev/cdk/layout/overview)). |
| Role-based shell (**new**) | Department Manager and HR Administrator are *additive* to the Employee role, not replacements for it — a manager still submits their own leave and marks their own daily presence, per `GET /me/profile` and `POST /me/attendance/today` being universal, role-agnostic endpoints. The nav shell (`mat-sidenav`) should show/hide sections based on the role claim `/auth/me` returns, not route to a separate app per role. System Administrator is the one case where this is genuinely ambiguous — confirm whether sysadmins are modeled as `employees` at all, or purely as `users` docs with no linked employee record (see Section 7). |
| Status colors — request lifecycle | 🟢 Green = Approved · 🟡 Amber = Pending · 🔴 Red = Rejected. Scoped strictly to `leave_requests` status and form validation errors — **never** reused for "on leave" (see below, and Section 2 Step 4). |
| Status colors — availability (**new**) | 🟢 Green = Present (Office) · 🔵 Blue = Present (Remote) · 🟣 Violet = On Leave · ⚪ Grey = Not Logged In / Not a Working Day. A deliberately separate token set from the request-lifecycle triad above — the `GET /manager/team/availability` DTO has five states, and coloring "On Leave" the same red as "Rejected" tells a manager an approved absence is a problem. |
| Density | Recommend **compact** (`density: -1` or `-2`). The case has only gotten stronger this revision — every HR/admin screen added below (H1–H4, S1) is table-heavy, same as the original Manager/Approval screens. Confirm with designer once Screens 3 & 4 are mocked up. |

---

## 2. Theming — How We'll Actually Do This

Theming breaks down when design and code drift into two separate sources of truth. The process below keeps one source of truth and two representations of it (Figma variables, Sass theme file).

**Step 1 — Pick a seed color, together.**
Run it through the [Material Theme Builder](https://www.figma.com/community/plugin/1034969338659738588/material-theme-builder) (Figma plugin) or its [web/GitHub version](https://github.com/material-foundation/material-theme-builder). One seed color generates the full M3 tonal palette (primary, secondary, tertiary, neutral, error) using Google's HCT color algorithm — this avoids the classic problem of designer and developer independently "eyeballing" slightly different blues.

**Step 2 — Designer applies the generated palette as Figma variables**, named to match M3 color roles (`primary`, `on-primary`, `primary-container`, `surface`, `surface-container`, `outline`, `error`, etc.) — not generic names like "Blue 1." This naming discipline is what makes Step 3 a mechanical translation instead of a guessing game.

**Step 3 — Developer wires the same palette into the Angular Material theme** via the `mat.theme` mixin (current API as of Angular Material v19+):

```scss
@use '@angular/material' as mat;

html {
  @include mat.theme((
    color: (
      primary: mat.$azure-palette,   // swap for the generated custom palette
      tertiary: mat.$blue-palette,
    ),
    typography: Roboto,
    density: -1,
  ));
}
```
*(If the project is on Angular Material v17–18, the equivalent entry point is `mat.define-theme(...)` instead of `mat.theme(...)` — check your installed version before copying code from tutorials, the API changed between versions.)*

**Step 4 — Extend for semantic colors Material doesn't ship, and keep the two status domains separate.** M3 defines an `error` role but has no built-in "success" or "warning" role — the request-lifecycle badges need both, so define `status-success` (approved) and `status-warning` (pending) as custom tokens alongside `error` (rejected).

That covers the request-lifecycle triad, but it's not enough for the **availability** domain (Section 4, Screens M1/X1), which has five states, not three. Don't stretch the same three tokens to cover it — add:
- `status-present-remote` — a tertiary-palette blue/teal, visually distinct from the primary-palette green used for present-office, so "present" doesn't look monolithic on a team grid.
- `status-on-leave` — map to the M3 `tertiary-container` role (or a dedicated violet if tertiary is already spoken for elsewhere), deliberately *not* `error`/red, since an approved absence is a planned, positive-workflow state, not a problem.
- `status-neutral` — `surface-variant`/`outline` grey, for `NOT_LOGGED_IN` and `NOT_A_WORKING_DAY`. These are informational, not evaluative, and shouldn't visually compete for attention with states a manager actually needs to act on.

Define all of these explicitly as Figma variables *and* matching CSS custom properties in the theme file — same discipline as Step 2 — rather than letting them get invented ad hoc per screen.

**Step 5 — Typography scale.** Designer defines text styles in Figma named to match M3 type roles (`display-large`, `headline-medium`, `title-small`, `body-medium`, `label-small`...). Developer passes the same scale into the `typography` config of `mat.theme`. Two families max — most enterprise dashboards get away with one.

**Step 6 — Dark mode: explicitly in or out of scope for v1.** Angular Material's theme mixin can set `color-scheme: light dark` to defer to the OS preference, but that only works cleanly if the designer has actually produced dark-mode variants of the palette — including the five availability tokens above, which is more surface area than v1's dark-mode scope may have accounted for.

**Keeping it in sync going forward:** if the design system changes (new status color, new type scale), it goes through Section 7 (Open Decisions Log) as a proposal, not a silent edit in either the Figma file or the Sass file alone.

---

## 3. Functional Coverage Map (New)

Every row below is a requirement from the functional spec, traced to the screen that implements it, the bounded context that owns the data, and the endpoint(s) it calls. This is the thing v1 didn't have — it's what lets you look at a requirement and know exactly which screen and which API surface are responsible for it, with nothing falling through the cracks.

### Employee

| Requirement | Screen | Bounded Context | Key Endpoint(s) |
|---|---|---|---|
| View profile (position, department, contract) | **E2** — My Profile | Employee Management | `GET /me/profile`, `/me/employment`, `/me/manager` |
| Submit a leave request | **E3** — Leave Request Form | Leave Management | `POST /me/leave-requests`, `.../eligibility-check`, `.../submit` |
| View leave balance | **E1** — Dashboard | Leave Management | `GET /me/leave-accounts` |
| View own leave request history/status | **E1** — Dashboard | Leave Management | `GET /me/leave-requests`, `/me/leave-requests/{id}` |
| View own attendance/presence record | **E4** — Attendance History | Attendance | `GET /me/attendance?from=&to=` |
| Toggle daily presence status | **E1** header widget | Attendance | `POST /me/attendance/today` |
| Receive notifications on leave response | **N1** — Notification Panel | Notification Service | `GET /me/notifications`, `POST /me/notifications/{id}/read` |

### Department Manager

| Requirement | Screen | Bounded Context | Key Endpoint(s) |
|---|---|---|---|
| View leave submissions of direct reports | **M2** — Leave Approval Interface | Leave Management | `GET /manager/leave-requests` |
| Approve/reject with comments | **M2** — Leave Approval Interface | Leave Management | `POST /manager/leave-requests/{id}/approve`, `/reject` |
| View team availability | **M1** — Manager Dashboard | Availability | `GET /manager/team/availability` |
| Receive notifications on new pending request | **N1** — Notification Panel | Notification Service | same as above |

### HR Administrator

| Requirement | Screen | Bounded Context | Key Endpoint(s) |
|---|---|---|---|
| View leave requests org-wide | **H1** — Org Leave Oversight | Leave Management | `GET /hr/leave-requests?department=&status=`, `/hr/reports/leave-balances` |
| Create/update employee profiles | **H4** — Employee & Org Structure | Employee Management | `/hr/employees`, `/hr/departments`, `/hr/positions`, `/reassign`, `/change-manager`, `/contracts` |
| Define leave types and policies | **H2** — Policy & Type Administration | Leave Management | `/hr/leave-types`, `/hr/leave-policies` |
| Manually adjust leave ledgers | **H3** — Ledger Adjustment | Leave Management | `POST /hr/leave-adjustments` |

### System Administrator

| Requirement | Screen | Bounded Context | Key Endpoint(s) |
|---|---|---|---|
| Manage user accounts | **S1** — User & Role Management | Identity & Access | `/admin/users` (GET/POST/PATCH), `/activate`, `/deactivate` |
| Assign/revoke roles | **S1** — User & Role Management | Identity & Access | `/admin/users/{id}/roles`, `/admin/roles` |

---

## 4. Screen-by-Screen Component Specification

Screens are grouped by role to match Section 3, since that's how someone will actually go looking for "what does HR see." Each screen header notes the bounded context(s) it touches. Where a screen is new this revision, it's marked **(new)**.

### 4.1 Employee

#### E1 — Dashboard

| Element | Designer spec (Figma) | Developer spec (Angular Material / CDK) |
|---|---|---|
| App shell / nav | Top toolbar or sidenav, avatar, notification bell (→ N1), primary CTA | `mat-toolbar` + `mat-sidenav-container`; CTA = `mat-raised-button` |
| **Presence toggle (new)** | Small segmented control in the toolbar/header, always visible, not buried in a menu | `mat-button-toggle-group` (Office / Remote), bound to `POST /me/attendance/today`. Keep this in the header, not on a separate page — the API describes it as "just a daily toggle," and a one-tap daily action shouldn't require navigation. |
| **Profile summary (new)** | Small card or avatar-menu link showing name/position/department, "View full profile →" | Links to **E2**; pulls from `GET /me/profile` |
| Leave-type stat cards | Card with small progress ring per Leave Type | `mat-card` + `mat-progress-spinner` (determinate), or custom SVG ring |
| "How is my balance calculated" panel | Expandable info panel | `mat-expansion-panel`, or a `MatDialog` for a "learn more" flow |
| Recent requests | Compact list/table with status badge | `mat-list` or a mini `mat-table` + `mat-chip` for status (request-lifecycle colors only) |
| Leave ledger | Full data table, paginated, sortable | `mat-table` + `mat-paginator` + `mat-sort`, from `GET /me/leave-accounts/{leaveTypeCode}/ledger?year=` |
| Upcoming approved leave | List or mini calendar preview | `mat-list`; calendar preview is a custom composed widget |
| Empty state (new employee) | Illustration + message + CTA | No built-in — compose from `mat-icon` + text + `mat-raised-button` |

#### E2 — My Profile **(new)**

*Employee Management.* v1 had no home for `GET /me/profile` at all — this was the single biggest gap between the API and the design doc.

| Element | Designer spec | Developer spec |
|---|---|---|
| Profile header | Avatar, name, title, department | `mat-card` header |
| Employment details | Hire date, employment status, current position | Plain bound display from `GET /me/employment` |
| Current assignment | Department, reporting line | From `GET /me/profile` (`currentAssignment`) |
| My manager | Name, contact | From `GET /me/manager`, linked to Identity & Access-visible contact info |
| Contracts | Read-only list — employees don't edit their own contracts | `mat-list`, read-only. Editing is HR's job (**H4**), not exposed here at all. |

#### E3 — Leave Request Form

| Element | Designer spec | Developer spec |
|---|---|---|
| Container | Full page **or** modal — *open decision, see Section 7* | `MatDialog` (if modal) or a routed page |
| Leave Type | Select field | `mat-select` |
| Date range | Range picker | `mat-date-range-picker` |
| Calculated days | Read-only computed field | Reactive form computed value |
| Balance context | Small stat card | `mat-card` |
| Reason / note | Textarea | `mat-form-field` + `matInput` (multiline) |
| **Live eligibility check (updated)** | Inline banner that updates as the person edits dates/type, before they submit | Debounced call to `POST /me/leave-requests/{id}/eligibility-check` on a `DRAFT`. This is a *speculative* check only — it greys out Submit or shows "insufficient balance," but it's not authorization. `submit` re-runs the same logic server-side; the UI must never treat the earlier check as a green light and skip handling a submit-time rejection. |
| Validation banner | Inline banner/alert | No built-in Material "alert" — custom banner component, reused for both the eligibility-check result and generic form errors |
| Submission feedback | Toast + confirmation | `MatSnackBar` |

#### E4 — Attendance History

*Attendance.* Deliberately thin — the daily action itself lives in E1's header; this is just the read-only log.

| Element | Designer spec | Developer spec |
|---|---|---|
| History table | Date, presence status (Office/Remote) | `mat-table`, from `GET /me/attendance?from=&to=` |
| Date range filter | Range picker | `mat-date-range-picker` |
| Status chip | Office / Remote | `mat-chip`, availability-domain colors (green/blue), not request-lifecycle colors |

---

### 4.2 Department Manager

#### M1 — Manager Dashboard (Team Overview & Availability)

*Availability (read-model) + Employee Management for roster.*

| Element | Designer spec | Developer spec |
|---|---|---|
| KPI cards | Three stat cards (Available / Absent / Pending) | `mat-card` |
| Workforce distribution chart | Donut or bar chart | **No Material component** — needs a charting library (ngx-charts, Chart.js, or D3); *decision needed, Section 7* |
| **Team availability grid (updated)** | Grid/list with a status chip per person | `mat-table`, from `GET /manager/team/availability?date=`. Five-state chip set (Office/Remote/On Leave/Not Logged In/Not a Working Day) — see Section 1's availability color tokens. Don't collapse this back down to the three request-lifecycle colors. |
| Team roster | List/table with avatar | `mat-table`, from `GET /manager/team` (Employee Management) |
| Pending requests widget | Compact list, links to M2 | `mat-list` + router link |
| Team filter | Dropdown | `mat-select` |

#### M2 — Leave Approval Interface

| Element | Designer spec | Developer spec |
|---|---|---|
| Requests table | Full data table with badges | `mat-table` + `mat-sort` + `mat-paginator` + `mat-chip` |
| Pending / Historical split | Tabs | `mat-tab-group` |
| Filters & search | Filter bar + search field | `mat-form-field` (search) + `mat-select` (filters) |
| Row detail view | Side drawer or modal | `mat-sidenav` (drawer) or `MatDialog` |
| **Approve / Reject (updated)** | Buttons, both opening a confirmation dialog for consistency | `mat-raised-button` (Approve) / `mat-stroked-button` (Reject), both routing through the same `MatDialog` pattern — but **Reject's comment field is a required `matInput`** (`POST /reject` needs `comment`), while Approve's is optional (`POST /approve` has `comment?`). Building two visually different flows for what's conceptually the same action just to handle one required field isn't worth it — same dialog, different validator. |
| Confirmation feedback | Inline status change + toast | `MatSnackBar` |
| Empty state (no pending) | Illustration + message | No built-in — custom |

---

### 4.3 HR Administrator

#### H1 — Organization Leave Oversight **(new)**

*Leave Management, org-wide.* This is read-only. The API has no `/hr/leave-requests/{id}/approve` — approval authority stays with the Manager context (M2) only. Don't add Approve/Reject buttons here; if HR override becomes a real requirement later, that's a new API endpoint decision, not a UI-only addition (logged in Section 7).

| Element | Designer spec | Developer spec |
|---|---|---|
| Org-wide requests table | Full table, department + status filters | `mat-table` + `mat-sort` + `mat-paginator`, from `GET /hr/leave-requests?department=&status=` |
| Filters | Department dropdown, status dropdown | `mat-select` ×2 |
| Balance reports | Summary cards or exportable table | `GET /hr/reports/leave-balances`; `mat-card` stats + `mat-table` |
| Status badge | Read-only | Request-lifecycle colors (green/amber/red) |

#### H2 — Leave Policy & Type Administration

*Leave Management.* `POST /hr/leave-policies` creates a **new versioned document** with an `effectiveFrom` date — it doesn't edit one in place. The UI needs to say so, the same way the ledger UI (H3) needs to avoid implying a balance is directly editable.

| Element | Designer spec | Developer spec |
|---|---|---|
| Leave types list | Table, enable/disable | `mat-table` + `mat-slide-toggle`, from `/hr/leave-types` |
| **Policy version history** | Per leave type: a timeline/table of policy versions by `effectiveFrom`, not a single editable form | `mat-table`, from `GET /hr/leave-policies?country=` |
| "New Policy Version" (not "Edit") | Button copy matters here — avoid "Edit Policy," use "New Policy Version," to match the append-only model | `MatDialog` → `POST /hr/leave-policies` |

#### H3 — Leave Ledger Adjustment

*Leave Management.* Every write to `leave_ledgers` is a named, append-only movement — this screen is a *record an adjustment* form, not a *set balance to X* form, and the copy should make that distinction obvious.

| Element | Designer spec | Developer spec |
|---|---|---|
| Employee lookup | Autocomplete/search | `mat-autocomplete` |
| Leave type | Select | `mat-select` |
| Adjustment amount | Numeric input, credit or debit | `matInput type=number`, signed |
| Reason (required) | Textarea | `mat-form-field` + `matInput`, required |
| **"Record Adjustment" (not "Edit Balance")** | Confirmation dialog stating this creates a permanent audit entry | `MatDialog` confirm → `POST /hr/leave-adjustments` |

#### H4 — Employee & Org Structure Administration 

*Employee Management.* v1's Screen 6 was a single generic "Admin Settings" table that didn't distinguish this from System Admin's user management (S1) — but they're different bounded contexts with different write patterns.

| Element | Designer spec | Developer spec |
|---|---|---|
| Section tabs | Employees / Departments / Positions | `mat-tab-group` |
| Employees table | Search, filter, "New Employee" | `mat-table` + `mat-form-field` (search), from `/hr/employees` |
| **Reassign / Change Manager (as distinct actions)** | Two separate buttons/flows, not a generic "Edit" that touches the same fields | Two separate `MatDialog` flows calling `POST /hr/employees/{id}/reassign` and `/change-manager` respectively — mirrors the API's own design (dedicated endpoints so the *old* assignment/manager gets pushed to history, not silently overwritten by a generic PATCH). A plain "edit department field" here would defeat that. |
| Contracts | List + add/edit | `mat-table` + `MatDialog`, `/hr/employees/{id}/contracts` |
| Departments / Positions tabs | Simple CRUD tables | `mat-table` + `MatDialog` |
| **"Create login" prompt (new)** | After creating an employee, an inline prompt/link: "This person doesn't have login access yet — create one →" | Links to **S1**. `POST /hr/employees` and `POST /admin/users` are deliberately two separate writes by two separate actors (HR vs. sysadmin) — nothing forces them to happen together, so the UI should nudge it rather than assume it. |

---

### 4.4 System Administrator

#### S1 — User & Role Management

| Element                             | Designer spec                                                     | Developer spec                                                                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users table                         | Email, linked employee (if any), role, status chip                | `mat-table`, from `GET /admin/users`. Status chip (`PENDING_ACTIVATION` / `ACTIVE` / deactivated) uses the neutral/grey token, not the approve/reject colors — account status isn't a leave-approval concept.               |
| **Activate / Deactivate (updated)** | Explicit button + confirm, not an instant-feeling toggle          | `mat-stroked-button` + confirm dialog → `POST /activate` or `/deactivate`. Avoid `mat-slide-toggle` here — it visually implies an instant client-side flip, but these are two distinct POST actions with real consequences. |
| Role assignment                     | Inline select or edit dialog                                      | `mat-select` in a `MatDialog`, → `POST /admin/users/{id}/roles`                                                                                                                                                             |
| New user                            | Form: email, optional linked employeeId, role                     | `MatDialog` → `POST /admin/users`                                                                                                                                                                                           |
| **Linked-from-H4 prompt (new)**     | If arriving via H4's "Create login" link, pre-fill the employeeId | Same form, employeeId param pre-populated                                                                                                                                                                                   |

---

### 4.5 Shared / Cross-Cutting

#### N1 — Notification Panel 

*Notification Service.* Deliberately no dedicated full-page inbox in v1 — flag as a future decision if volume warrants one (Section 7).

| Element | Designer spec | Developer spec |
|---|---|---|
| Bell icon + unread badge | Toolbar icon, count badge | `mat-icon` + `mat-badge` |
| Dropdown panel | List of recent notifications | `mat-menu` or CDK `Overlay`, from `GET /me/notifications?unread=true` |
| Mark as read | Tap/click a notification | `POST /me/notifications/{id}/read`; optimistically decrement the badge count in the UI rather than waiting on a refetch |

#### X1 — Workforce Calendar

Same component serves two audiences with different scope — build it once, reuse it, rather than a Manager version and an HR version.

| Element | Designer spec | Developer spec |
|---|---|---|
| Calendar grid | Month / Week / Day views | **No Material calendar-grid component** — `mat-datepicker`'s calendar is single-date-select only. Needs a third-party lib (e.g. `angular-calendar`) or custom build; *decision needed, Section 7* |
| **Scope switch (updated)** | For HR: department filter, org-wide. For Manager: team-scoped, no filter needed. | Manager view calls `GET /manager/team/availability`; HR view calls `GET /availability?date=&department=`. Same rendering component, different data source bound by role. |
| View toggle | Segmented control | `mat-button-toggle-group` |
| Day legend | Small legend key — must cover the 5-state availability palette, not just 3 colors | Custom, plain markup |
| Day detail popover | Popover on click | CDK `Overlay` + `Portal` |

---

## 5. Accessibility — Shared Checklist

Material components meet WCAG defaults *if* neither side overrides them carelessly. Explicitly confirm:
- [ ] Color contrast checked for all custom (non-Material-default) colors, especially the status badges — [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/), 4.5:1 minimum for body text
- [ ] Every custom-built element (banner, empty state, calendar grid, chart) gets real keyboard navigation and ARIA labeling
- [ ] Focus states are visible everywhere, not just on default Material components
- [ ] **Non-color distinction extends to the availability palette, not just charts/calendar** — with five status states now (Office/Remote/On Leave/Not Logged In/Not a Working Day) instead of three, colorblind users need icon or pattern differentiation on every chip that uses these tokens, not just the calendar and chart
- [ ] Reject's required-comment dialog (M2) and every other required-field dialog gets a real `aria-required` + inline error, not just a disabled submit button with no explanation

---

## 6. Handoff Workflow (Figma → Code)

- **Figma file structure:** one page per screen, plus a dedicated `Design System` page (color/type/spacing tokens, including the new availability token set) and an `Inspiration` page kept separate from final designs.
- **Naming convention:** name Figma pages/components with the screen IDs used in Section 4 (`E1`, `M2`, `H3`, `S1`, etc.) so this doc and the Figma file stay trivially cross-referenceable, and layer names should match the "Developer spec" column where possible (e.g. name a Figma component `stat-card` if it's implemented as `mat-card`).
- **Redlines/annotations:** use Figma's Dev Mode (or equivalent) to annotate spacing, states (hover/disabled/error), and responsive behavior per breakpoint.
- **Review cadence:** designer and developer walk through each screen together before implementation starts — catches "no Material component for this" cases while they're still cheap to redesign around.

---

## 7. Open Decisions Log

*(Running list — add a row whenever a screen surfaces something that needs a call. Update Status as it's resolved.)*

| Decision needed | Options | Affects | Status |
|---|---|---|---|
| Leave Request Form: modal or full page | Modal (faster) vs. routed page (room to grow) | E3 | Open |
| Charting library for distribution chart | ngx-charts / Chart.js / D3 | M1 | Open |
| Calendar grid implementation | Third-party lib (`angular-calendar`) vs. custom build | X1 | Open |
| Dark mode in v1 scope | Yes / No — note the availability token set adds surface area if yes | Theming (Section 2) | Open |
| Custom banner/alert component spec | Design once, reuse everywhere (E3, M2 dialogs at minimum) | E3, M2 | Open |
| Density setting | Compact (-1/-2) vs. default (0) | Theming (Section 1) | Proposed: compact |
| **Is a System Administrator also an `employees` doc, or purely a `users` doc?** | Employee-with-sysadmin-role vs. pure system account | S1, Identity & Access data model | Open |
| **Should HR get approve/reject override on H1?** | Yes (needs new API endpoint) / No, HR stays read-only-plus-adjustments | H1, Leave Management API | Open — currently designed as read-only per the existing API surface |
| **H4 → S1 "create login" handoff: inline prompt vs. automatic** | Manual link (current design) vs. auto-triggering the user-creation flow | H4, S1 | Proposed: manual link (matches the API's intentional two-actor split) |
| **Activate/deactivate interaction pattern** | Toggle (`mat-slide-toggle`) vs. button + confirm | S1 | Proposed: button + confirm |
| **Dedicated full-page notification inbox** | Panel only (current) vs. add a full `/notifications` page | N1 | Open — revisit if notification volume in practice makes the dropdown insufficient |
| **`status-on-leave` exact color** | Dedicated violet vs. reuse of `tertiary-container` | Theming (Section 2, Step 4) | Open |

---

## 8. Change Log

*(Every change to a decision above gets a line here — who, when, what changed, why.)*

| Date | Change | By |
|---|---|---|
| — | Initial draft | — |
| 2026-08-17 | Rev 2: reconciled screen spec against the finalized bounded-context model, REST API design, and role-based functional requirements. Added Section 3 (Functional Coverage Map). Added screens E2, E4, H1–H4, S1, N1 to cover profile view, attendance history, HR leave oversight/policy/ledger/employee admin, and system-admin user management — all previously either missing or folded into a single generic "Admin Settings" screen. Split the request-lifecycle status colors from a new availability-domain color set (5 states) to stop "On Leave" from rendering the same red as "Rejected." Updated E3 to reflect the draft → eligibility-check → submit flow, M2's Reject to require a comment, H2/H3 to reflect the API's append-only (versioned policy / ledger movement) model instead of implying in-place edits, and H4's Reassign/Change-Manager to mirror the API's dedicated endpoints instead of a generic edit. | Design/Dev review |
