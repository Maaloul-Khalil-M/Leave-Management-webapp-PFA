---
lastUpdated: Thu, Sep 3 • 2:35 PM
created: Thu, Aug 27 • 12:34 AM
title: BEGINNER-GUIDED-SPRINT-ROADMAP
---
[[doc-try]]
## Leave & Workforce Management System

**Spring Boot · MongoDB · Keycloak · Angular Material 3**

A progressive implementation guide written for a student who is learning the stack while building a real system.

---

## How to Use This Document

This is not a checklist you rush through.
It is a **guided course + real engineering plan**.

For every sprint you will:

1. Learn a small set of new ideas
2. Implement one thin slice
3. Run it and verify it works
4. Understand *why* it was designed that way
5. Commit a meaningful milestone
6. Only then move forward

**Rules of the road**

- Never skip a verification step.
- If something feels confusing, stop and re-read the “Concepts you need right now” section.
- Treat advanced topics marked “black box for now” as black boxes. You will open them later.
- Keep your commits small and named after the milestone you just finished.

---

## 1. What You Are Building (Big pIcture)

You are building a multi-country leave and workforce management system used by four kinds of people:

| Actor | What they care about |
|-------|----------------------|
| Employee | Request leave, see balance, mark daily presence |
| Manager | Approve/reject requests of direct reports, see who is available |
| HR | Manage employees, policies, adjust balances, see organisation-wide picture |
| System Admin | Manage user accounts and roles, organisation settings, calendars |

The system has two important design choices that will appear again and again:

1. **Users and Employees are separate**
   A person can have a login (user) without being an employee, and an employee record can exist before a login is created.

2. **Leave balance is a ledger**
   You never edit a balance number. You only add movements (credit or debit). The available balance is always calculated from the list of movements.

Everything else in the project exists to support these two ideas cleanly and safely.

---

## 2. Technology Stack – what Each Piece is for

You do not need to master everything on day one.
Here is the map of the tools and *when* you will meet them.

| Technology                               | Role in the project         | When you first meet it        |
| ---------------------------------------- | --------------------------- | ----------------------------- |
| Java + Spring Boot                       | Backend server              | SP-1                          |
| MongoDB                                  | Document database           | SP-1                          |
| MapStruct                                | Automatic object mapping    | SP-1                          |
| Keycloak                                 | Login and identity provider | SP-2                          |
| Angular                                  | Frontend application        | SP-2                          |
| Angular Material 3                       | UI components and theming   | SP-2 / SP-4                   |
| Spring Security (OAuth2 Resource Server) | Protecting API endpoints    | SP-2                          |
| OpenAPI / Swagger                        | Living API documentation    | SP-1 (light), SP-9 (complete) |

**Important mental model**

```
Browser (Angular)
      │  HTTP + JWT
      ▼
Spring Boot Controllers
      │  DTOs
      ▼
Services (business rules live here)
      │  Domain objects
      ▼
Repositories
      │
      ▼
MongoDB
```

You will build this stack one layer at a time.

---

## 3. Learning Path Overview

| Sprint | Theme | What you can do at the end |
|--------|-------|----------------------------|
| SP-0 | Orientation | You understand the domain and have empty projects |
| SP-1 | Core data | You can store and read reference data |
| SP-2 | Identity | A real user can log in and see “me” |
| SP-3 | Leave money | Balances exist as an append-only ledger |
| SP-4 | Asking for leave | An employee can create and submit a leave request |
| SP-5 | Saying yes/no | A manager can approve or reject and see team availability |
| SP-6 | Presence & messages | Daily attendance + in-app notifications work |
| SP-7 | HR tools | HR can manage people, policies and adjustments |
| SP-8 | Admin & calendar | System admin can manage users and public holidays |
| SP-9 | Hardening | Security, errors, tests and documentation are solid |
| SP-10 | Demo | One-command demo with seed data |

---

# SP-0 — Orientation & Empty Projects

**Time estimate:** 1–2 days
**Goal:** Understand the problem before writing any business code.

### What You Should Already Know

- Basic Java syntax
- How to create a Spring Boot project (or willingness to follow the Spring Initializr)
- How to create an Angular project (or willingness to follow the Angular CLI)

### What You Will Learn

- The difference between a User and an Employee
- Why leave balance is a ledger instead of a simple number
- The four status machines that will control the whole application

### Concepts You Need Right now

**User vs Employee**
A User is a login identity (email + Keycloak subject).
An Employee is the HR record (name, department, manager, contracts).
They are linked by an optional `employeeId` field on the user.
This separation is intentional and will appear in almost every later sprint.

**Ledger thinking**
Imagine a bank account. You never change the balance field directly.
You only add transactions. The balance is the sum of all transactions.
Leave works the same way.

**Status machines (simple version)**
- Leave request: `DRAFT → PENDING → APPROVED / REJECTED → CANCELLED`
- User account: `PENDING_ACTIVATION → ACTIVE ↔ SUSPENDED → ARCHIVED`
- Employee: `ACTIVE ↔ SUSPENDED → TERMINATED`

You do not need to implement them yet. Just know they exist.

### Steps

1. Read the two source documents once (do not try to memorise).
2. On paper or a whiteboard, draw the main collections and the arrows between them (see the relationship section of the API document).
3. Create an empty Spring Boot project (Web, MongoDB, Validation, Lombok if you like).
4. Create an empty Angular project (standalone components recommended).
5. Commit both empty projects with the message `SP-0: empty projects and domain sketch`.

### Verification

- Both projects compile / serve with zero business code.
- You can explain out loud the difference between User and Employee.

### Self-check before SP-1

- [ ] I can explain why Users and Employees are separate collections.
- [ ] I understand that leave balance will be calculated, not stored as a single editable number.
- [ ] I have two empty, compiling projects.

---

# SP-1 — Backend Foundation (Reference Data)

**Time estimate:** 4–6 days
**Goal:** Store and retrieve the static data the whole system depends on.

### What You Should Already Know

- How to create a Spring Boot project
- Basic REST concepts (GET, POST, JSON)

### What You Will Learn

- How a MongoDB document looks in Java
- Why we use MapStruct instead of writing mappers by hand
- How to return a consistent pagination envelope
- How to return consistent error responses

### Concepts

**Understand now**
- MongoDB stores documents (JSON-like), not rows.
- A Spring `@Document` class is just a Java class that maps to one collection.
- A Repository interface lets you save and find documents without writing SQL.
- MapStruct generates the boring conversion code between Document ↔ Domain ↔ DTO at compile time.

**Black box for now**
- How MapStruct generates the implementation class (you only write the interface).
- Exact MongoDB query plans.

**Later**
- Multi-document transactions
- Advanced indexing strategies

### Why This Architecture

```
Controller  →  receives HTTP, talks only DTOs
     ↓
Service     →  business logic lives here (still empty in this sprint)
     ↓
Mapper      →  converts between layers
     ↓
Repository  →  talks to MongoDB
```

If you put business rules in the Controller or the Mapper, the project becomes hard to test and hard to change. We keep the layers strict from the first day so the habit is already formed.

### Implementation Milestones

**Milestone 1.1 – Project skeleton**
- Add the necessary dependencies (spring-boot-starter-data-mongodb, validation, mapstruct, springdoc-openapi).
- Configure the MongoDB connection in `application.yml`.
- Commit: `SP-1.1: Spring Boot + MongoDB skeleton`

**Milestone 1.2 – First documents**
Create the simplest collections first:

- `organization_settings` (singleton – only one document ever)
- `roles`
- `departments`
- `positions`
- `leave_types`

Add the unique indexes mentioned in the API document (code, email, etc.).

Commit: `SP-1.2: core documents and indexes`

**Milestone 1.3 – Repositories + MapStruct**
- Write the repository interfaces.
- Write MapStruct mapper interfaces (Document → Domain → Response DTO).
- Make sure the project still compiles (MapStruct runs at compile time).

Commit: `SP-1.3: repositories and mappers`

**Milestone 1.4 – Simple CRUD services and controllers**
- Implement plain create / read / update for the five collections.
- Put them under `/api/v1/admin/...` or `/api/v1/hr/...` as appropriate.
- Return a pagination envelope for lists:

```json
{
  "data": [ ... ],
  "pagination": {
    "nextCursor": null,
    "hasMore": false,
    "limit": 20
  }
}
```

Commit: `SP-1.4: basic CRUD endpoints`

**Milestone 1.5 – Error model**
Create one global exception handler that always returns:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": [ ... ],
    "requestId": "..."
  }
}
```

Commit: `SP-1.5: consistent error responses`

**Milestone 1.6 – Seed data + OpenAPI**
- Write a `CommandLineRunner` that inserts sample leave types, departments, one organisation setting (choose FR or TN).
- Enable springdoc so you can open `/swagger-ui.html`.

Commit: `SP-1.6: seed data and OpenAPI`

### Verification after Each Milestone

- Call the endpoint with curl or Swagger and see the expected JSON.
- Force a validation error (send an empty required field) and confirm the error shape.

### Common Mistakes

- Putting business logic inside a MapStruct mapper → move it to the Service.
- Forgetting the unique index → you will get duplicate data later.
- Returning the MongoDB document directly from the controller → always go through a DTO.

### Self-check before SP-2

- [ ] I can create a leave type and read it back.
- [ ] Pagination and error responses look exactly like the examples above.
- [ ] I understand why the Controller never talks to the Repository directly.

---

# SP-2 — Identity: Users, Employees and Login

**Time estimate:** 5–7 days
**Goal:** A real person can log in with Keycloak and the backend knows who they are.

### What You Should Already Know

- The difference between User and Employee (from SP-0)
- How to call a REST endpoint

### What You Will Learn

- How OpenID Connect (OIDC) login works at a high level
- How Spring Security validates a JWT
- How the backend links a Keycloak identity to your own `users` collection
- Why there is no “register” endpoint

### Concepts

**Understand now**
- Keycloak is an external identity provider. Your backend never stores passwords.
- After login the frontend receives a JWT (a signed token).
- Every API call sends `Authorization: Bearer <token>`.
- Spring Security checks the signature and extracts the `sub` (subject) and `email` claims.
- Your code then loads the `users` document that has that subject (or email on first login).

**Black box for now**
- How Keycloak itself is configured in production.
- The exact cryptography of JWT signatures.

**Later**
- Fine-grained permission codes inside roles.
- Refresh-token rotation.

### Why the Linking is Done This Way

The API document is clear: **no self-registration**.
An administrator must create the `users` document first.
On the very first successful login, an internal service (not a public endpoint) looks at the email coming from Keycloak and links the `identity.subject`.
If the email is unknown, login is rejected.

This keeps the identity source of truth inside your database while still using a professional identity provider.

### Implementation Milestones

**Milestone 2.1 – Employee document**
- Create the full `employees` document (profile, currentAssignment, contracts, currentManager, histories).
- Add HR endpoints: `POST /hr/employees`, `GET /hr/employees`, `PATCH /hr/employees/{id}`.

Commit: `SP-2.1: employees collection and HR endpoints`

**Milestone 2.2 – User document**
- Create the `users` document (`email`, `employeeId` nullable, `identity`, `role`, `accountStatus`).
- Add Admin endpoints: `POST /admin/users`, `GET /admin/users`, `PATCH /admin/users/{id}`.

Commit: `SP-2.2: users collection and admin endpoints`

**Milestone 2.3 – Keycloak + Spring Security**
- Configure Spring Security as an OAuth2 Resource Server.
- Protect all endpoints except actuator/health.
- Load the `users` document after the JWT is validated.

Commit: `SP-2.3: JWT validation and user lookup`

**Milestone 2.4 – First-login linking**
- Implement the internal linking logic (email → existing user → store subject).
- Reject unknown emails.
- On success, update `lastLoginAt` and set status to ACTIVE if it was PENDING_ACTIVATION.

Commit: `SP-2.4: first-login linking (no self-registration)`

**Milestone 2.5 – /me endpoints**
- `GET /api/v1/me` – basic identity + role + employeeId
- `GET /api/v1/me/profile` – full employee profile (only if employeeId is present)

Commit: `SP-2.5: /me and /me/profile`

**Milestone 2.6 – Angular login shell**
- Add keycloak-js (or angular-oauth2-oidc).
- After login, call `GET /me` and show the user’s name and role in the toolbar.
- Create a minimal “My Profile” page (this is the beginning of screen E2).

Commit: `SP-2.6: Angular login and profile page`

### Verification

- Create a user with Admin API.
- Log in with Keycloak using that email.
- Call `GET /me` and see your own data.
- Try an unknown email → login must fail.

### Common Mistakes

- Trying to create users automatically from Keycloak → violates BR-1.
- Storing the Keycloak role in the JWT as the source of truth → the API document says the application role comes from your `users.role` field.
- Forgetting that `employeeId` can be null (pure admin accounts).

### Self-check before SP-3

- [ ] I can create a user and an employee and link them.
- [ ] After login I see my own profile.
- [ ] I understand why there is no public registration endpoint.

---

# SP-3 — Leave Ledger & Policies

**Time estimate:** 5–7 days
**Goal:** Leave balance exists as an append-only ledger. HR can adjust it.

### What You Should Already Know

- How to save a document with an embedded array
- The difference between a User and an Employee

### What You Will Learn

- Why we never update a movement after it is written
- How policy resolution works (country + leave type + date)
- How available balance is calculated

### Concepts

**Understand now**
- A `leave_ledgers` document belongs to one employee + one leave type + one year.
- Inside it there is a list of `movements`.
- Each movement has a type (`MONTHLY_ACCRUAL`, `APPROVED_LEAVE_DEBIT`, `HR_ADJUSTMENT_CREDIT`, …), an amount, a date and an optional note.
- `availableBalance = accrued + carriedOver – consumed` (the exact formula is in the schema; the important part is that it is derived).

**Black box for now**
- The nightly accrual job that will later add MONTHLY_ACCRUAL movements.

**Later**
- Multi-year queries and carry-over rules in full detail.

### Why Append-only

If someone could edit an old movement, the audit trail would be lost.
Corrections are done by adding a new compensating movement (a credit that cancels a previous debit, or vice versa).
This is the same idea used by banks and accounting systems.

### Implementation Milestones

**Milestone 3.1 – Policy documents**
- Create `leave_policies` (versioned by `effectiveFrom` / `effectiveTo`).
- Write the resolution method: given country + leaveTypeCode + date → correct policy.
- CRUD endpoints under `/hr/leave-policies`.

Commit: `SP-3.1: leave policies and resolution`

**Milestone 3.2 – Ledger document**
- Create `leave_ledgers` with the embedded `movements` array.
- Unique index on `{employeeId, leaveTypeCode, year}`.

Commit: `SP-3.2: leave_ledgers collection`

**Milestone 3.3 – Append movement service**
- Method that receives a new movement, adds it to the array, and recalculates `availableBalance`.
- Never modify or delete existing movements.

Commit: `SP-3.3: append-only movement logic`

**Milestone 3.4 – HR adjustment endpoint**
- `POST /hr/leave-adjustments`
- Body contains employeeId, leaveTypeCode, year, amount, type, note.
- Uses the append service from the previous milestone.

Commit: `SP-3.4: HR leave adjustment endpoint`

**Milestone 3.5 – Employee read endpoints**
- `GET /me/leave-ledgers`
- `GET /me/leave-ledgers/{id}`

Commit: `SP-3.5: employee leave balance endpoints`

**Milestone 3.6 – First UI pieces**
- On the employee dashboard (E1), show simple stat cards for each leave type (available / consumed).
- On the HR side, build the “Record Adjustment” form (screen H3).
  The button must say “Record Adjustment”, never “Edit Balance”.

Commit: `SP-3.6: balance cards and adjustment form`

### Verification

- Create an adjustment of +2 days.
- Read the ledger → you see one new movement and the available balance increased by 2.
- Try to change an old movement directly in the database → your service must never do that.

### Common Mistakes

- Updating `availableBalance` without adding a movement → breaks the audit trail.
- Allowing negative balance on an adjustment without a clear business decision → decide and document it.
- Using the word “edit” in the UI → the design document forbids it.

### Self-check before SP-4

- [ ] I can explain why we never edit a movement.
- [ ] An adjustment appears as a new line in the movements list.
- [ ] The employee can see their own balances.

---

# SP-4 — Employee Leave Requests

**Time estimate:** 6–8 days
**Goal:** An employee can create a draft, check eligibility, and submit a leave request.

### What You Should Already Know

- How the ledger works
- How `/me` endpoints resolve the current employee

### What You Will Learn

- How duration is calculated (working days vs calendar days, weekends, holidays)
- The eligibility rules that protect the company
- The leave request state machine in practice

### Concepts

**Understand now**
- A leave request starts life as `DRAFT`.
- Only the owner can submit it → status becomes `PENDING`.
- Before submission the system runs eligibility checks (balance, overlap, employee status, minimum block size, etc.).
- Duration is not simply `endDate – startDate`. It respects the policy’s `accrualUnit` and the calendar.

**Black box for now**
- The exact calendar-day calculation algorithm (you can start with a simple version and improve it when calendars arrive in SP-8).

**Later**
- Half-day semantics in full detail
- Notice-period rules per country

### Implementation Milestones

**Milestone 4.1 – Leave request document**
- Create `leave_requests` with employeeSnapshot, statusHistory, half-day flags, durationDays, etc.
- Status enum and the allowed transitions.

Commit: `SP-4.1: leave_requests collection`

**Milestone 4.2 – Duration calculation (first version)**
- Implement a pure function that receives start, end, half-day flags, accrualUnit, weekendDays and returns the number of days.
- Unit-test it with a few examples.

Commit: `SP-4.2: duration calculation`

**Milestone 4.3 – Create draft**
- `POST /me/leave-requests` → status = DRAFT, store employeeSnapshot, calculate duration.

Commit: `SP-4.3: create draft leave request`

**Milestone 4.4 – Eligibility service**
- Checks: employee is ACTIVE, enough balance, no overlap with already APPROVED leave, minBlockDays, etc.
- Returns a clear list of reasons when eligibility fails.

Commit: `SP-4.4: eligibility service`

**Milestone 4.5 – Submit**
- `POST /me/leave-requests/{id}/submit`
- Must be DRAFT and owned by the caller.
- Runs eligibility; if ok → status = PENDING, append statusHistory, emit event (for notifications later).

Commit: `SP-4.5: submit leave request`

**Milestone 4.6 – Cancel (owner)**
- `POST /me/leave-requests/{id}/cancel` for DRAFT or PENDING.

Commit: `SP-4.6: cancel own request`

**Milestone 4.7 – Angular Leave Request Form (E3)**
- Form with leave type, date range, half-day toggles, reason.
- Live eligibility banner (call the eligibility endpoint while the user is editing).
- Submit button that respects the server response.
- Recent requests list on the dashboard with status chips (green / amber / red only).

Commit: `SP-4.7: Leave Request Form and dashboard list`

### Verification

- Create a draft → see it with status DRAFT.
- Submit with insufficient balance → receive `INSUFFICIENT_BALANCE`.
- Submit a valid request → status becomes PENDING.
- The duration shown in the UI matches the duration stored in the database.

### Common Mistakes

- Trusting the eligibility result shown in the UI and skipping the server-side check on submit → never do that.
- Allowing overlap with another APPROVED leave → violates BR-8.
- Using the request-lifecycle colours for anything else → keep them only for leave request status.

### Self-check before SP-5

- [ ] I can create, submit and cancel a leave request as an employee.
- [ ] Eligibility failures return the correct error codes.
- [ ] I understand that the UI eligibility check is only a preview.

---

# SP-5 — Manager Approval & Team Availability

**Time estimate:** 6–8 days
**Goal:** A manager can see their team, approve or reject requests, and view who is available on a given day.

### What You Should Already Know

- Leave request state machine
- How the ledger append works

### What You Will Learn

- How “manager-of” authorisation works
- Why availability is never stored
- The second colour system (availability colours)

### Concepts

**Understand now**
- A manager may only act on requests whose employee has `currentManager.employeeId` equal to the manager’s own employeeId.
- Approving a request that deducts balance must create an `APPROVED_LEAVE_DEBIT` movement inside a transaction.
- Availability is calculated on the fly from: employees + approved leaves + attendances + calendar.

**Black box for now**
- The exact charting library you will use for the distribution chart on the manager dashboard.

**Later**
- Whether a manager can approve their own leave (current assumption: no).

### Why Two Colour Systems

The design document is very clear:

- Request lifecycle → green = Approved, amber = Pending, red = Rejected
- Availability → green = Present Office, blue = Present Remote, violet = On Leave, grey = Not logged in / Not a working day

Using red for “On Leave” would make an approved absence look like a problem. Keep the two token sets completely separate.

### Implementation Milestones

**Milestone 5.1 – Manager authorisation helper**
- Method: “is the current user the currentManager of this employee?”
- Use it on every manager endpoint.

Commit: `SP-5.1: manager-of check`

**Milestone 5.2 – List team and pending requests**
- `GET /manager/team`
- `GET /manager/leave-requests` (filterable by status)

Commit: `SP-5.2: team and pending requests endpoints`

**Milestone 5.3 – Approve**
- `POST /manager/leave-requests/{id}/approve`
- Transaction: update request + append debit movement (if needed) + statusHistory.
- Reject with `INSUFFICIENT_BALANCE` if the ledger would go negative.

Commit: `SP-5.3: approve leave request`

**Milestone 5.4 – Reject**
- `POST /manager/leave-requests/{id}/reject`
- Comment is required.

Commit: `SP-5.4: reject leave request`

**Milestone 5.5 – Availability endpoint**
- `GET /manager/team/availability?date=`
- Pure computation, no writes.
- Return the five possible statuses.

Commit: `SP-5.5: computed team availability`

**Milestone 5.6 – Manager screens (M1 + M2)**
- Dashboard with KPI cards and availability grid (five-state chips).
- Approval interface with table, tabs (Pending / Historical), side drawer.
- Approve and Reject both open the same confirmation dialog; Reject makes the comment field required.

Commit: `SP-5.6: Manager Dashboard and Approval UI`

### Verification

- Log in as a manager.
- See only your direct reports.
- Approve a request → ledger movement appears and balance decreases.
- Call availability for today → statuses look correct.
- Try to approve a request of someone who is not your report → 403.

### Common Mistakes

- Forgetting the transaction around approve → request and ledger can get out of sync.
- Re-using the red “Rejected” colour for “On Leave”.
- Letting a pure ADMIN (no employeeId) call manager endpoints.

### Self-check before SP-6

- [ ] Only direct reports appear in the manager views.
- [ ] Approval correctly debits the ledger.
- [ ] Availability is calculated, never stored.

---

# SP-6 — Attendance & Notifications

**Time estimate:** 4–6 days
**Goal:** Employees mark daily presence and everyone receives in-app notifications.

### What You Should Already Know

- How events can be emitted after a status change (you already emit on submit/approve)

### What You Will Learn

- Why notifications are created by a separate consumer, not by the leave service itself
- How a simple daily toggle is exposed in the UI

### Concepts

**Understand now**
- Attendance is a simple upsert on `{employeeId, date}`.
- Notifications are written by event listeners (or a small notification service) after leave events.
- The leave service itself never creates a notification document directly (BR-13).

**Black box for now**
- Email delivery (can be added later).
- Real message broker (Spring Application Events are enough for the student project).

### Implementation Milestones

**Milestone 6.1 – Attendance**
- `attendances` collection
- `PUT /me/attendances/{date}` (or a dedicated `/me/attendance/today`)
- `GET /me/attendances`

Commit: `SP-6.1: attendance endpoints`

**Milestone 6.2 – Notification collection and read API**
- `notifications` collection
- `GET /me/notifications`
- `POST /me/notifications/{id}/read`

Commit: `SP-6.2: notification read API`

**Milestone 6.3 – Event consumers**
- On leave submitted → notify the manager
- On leave approved / rejected / cancelled → notify the employee

Commit: `SP-6.3: notification event consumers`

**Milestone 6.4 – UI**
- Presence toggle in the main toolbar (always visible) – screen E1 header.
- Attendance history table (E4) using the availability colour tokens.
- Notification bell + badge + dropdown panel (N1). Optimistic mark-as-read.

Commit: `SP-6.4: presence toggle and notification panel`

### Verification

- Toggle presence → document is created/updated.
- Submit a leave request → manager sees a notification.
- Approve it → employee sees a notification and can mark it read.

### Self-check before SP-7

- [ ] Presence can be toggled and appears in history.
- [ ] Notifications appear after the important leave events.
- [ ] The leave service does not write notification documents itself.

---

# SP-7 — HR Administration

**Time estimate:** 5–7 days
**Goal:** HR can manage the organisation’s people, policies and see the global leave picture.

### What You Should Already Know

- All previous endpoints
- The difference between a generic PATCH and a dedicated “reassign” / “change-manager” action

### What You Will Learn

- Why reassign and change-manager are separate endpoints (history must be pushed, not overwritten)
- How to keep HR screens read-only for approval (approval stays with managers)

### Implementation Milestones

**Milestone 7.1 – Complete employee management**
- Search, filter, pagination on `/hr/employees`
- Dedicated `POST /hr/employees/{id}/reassign`
- Dedicated `POST /hr/employees/{id}/change-manager`
- Contract management endpoints

Commit: `SP-7.1: full employee management API`

**Milestone 7.2 – Org-wide leave view**
- `GET /hr/leave-requests` with department and status filters
- Optional simple balance report endpoint

Commit: `SP-7.2: HR leave oversight API`

**Milestone 7.3 – HR screens (H1–H4)**
- H1: Org-wide requests table (no approve buttons)
- H2: Leave types + policy version history + “New Policy Version” dialog
- H3: Ledger adjustment (already started, polish)
- H4: Employees / Departments / Positions tabs, separate Reassign and Change Manager dialogs, “Create login” prompt that links to the admin user screen

Commit: `SP-7.3: HR administration screens`

### Verification

- Create an employee, then later create the linked user from the admin screen.
- Change a manager → the old manager appears in managerHistory.
- HR can see all requests but cannot approve them.

### Self-check before SP-8

- [ ] Reassign and change-manager push history correctly.
- [ ] HR screens match the design document (especially the “no approve” rule on H1).

---

# SP-8 — System Admin & Calendars

**Time estimate:** 4–6 days
**Goal:** System administrators can manage accounts and public holidays. Duration calculation becomes complete.

### What You Should Already Know

- How users and roles work
- How duration calculation currently works

### What You Will Learn

- How calendar exceptions (public holidays, special days) affect leave duration
- Why pure admin accounts may have `employeeId = null`

### Implementation Milestones

**Milestone 8.1 – Admin user & role management**
- Full CRUD for users and read for roles
- Activate / Deactivate endpoints (not a simple toggle)
- Organisation settings singleton

Commit: `SP-8.1: admin user and organisation endpoints`

**Milestone 8.2 – Calendars**
- `calendars` and `calendar_days` collections
- CRUD endpoints
- Unique index on `{calendarId, date}`

Commit: `SP-8.2: calendar collections`

**Milestone 8.3 – Duration uses calendar**
- Update the duration function so it also looks at public holidays and special days.

Commit: `SP-8.3: duration respects calendar exceptions`

**Milestone 8.4 – Admin screens (S1) + calendar UI**
- User table with status chips (neutral grey, not leave colours)
- Activate / Deactivate buttons with confirmation dialogs
- Simple calendar management UI
- Optional shared Workforce Calendar component (X1) that both Manager and HR can use

Commit: `SP-8.4: admin and calendar UI`

### Verification

- Create a pure admin user (no employee).
- Add a public holiday → a leave request that covers that day now counts fewer days.
- Activate / Deactivate works with confirmation.

### Self-check before SP-9

- [ ] Public holidays correctly reduce calculated duration.
- [ ] Admin can manage users who have no employee record.

---

# SP-9 — Hardening, Tests & Documentation

**Time estimate:** 5–7 days
**Goal:** The system is secure, well-documented and tested enough for a student project demo.

### What You Will Learn

- How to prove that every endpoint enforces the right authorisation
- How to write tests that protect the business rules
- How to produce a complete OpenAPI description

### Implementation Milestones

**Milestone 9.1 – Authorisation matrix**
- Go through every endpoint and confirm the exact rule (Authenticated / Role / Owner / Manager-of).
- Add missing checks.
- Protect against IDOR (Insecure Direct Object Reference).

Commit: `SP-9.1: complete authorisation`

**Milestone 9.2 – Error codes and rate limiting**
- Make sure every business rule returns the documented error code.
- Add simple rate limiting on write endpoints.

Commit: `SP-9.2: error model and rate limiting`

**Milestone 9.3 – Tests**
- Unit tests for eligibility, state transitions, ledger append.
- Integration tests with Testcontainers (MongoDB).
- A few critical Angular tests (leave form, reject dialog).

Commit: `SP-9.3: automated tests`

**Milestone 9.4 – OpenAPI completion**
- Every endpoint documented with security scheme, request/response schemas and error responses.
- Export the YAML.

Commit: `SP-9.4: complete OpenAPI`

**Milestone 9.5 – Accessibility pass**
- Check contrast of the two status colour systems.
- Keyboard navigation on custom components.
- Non-colour distinction for the five availability states.

Commit: `SP-9.5: accessibility checklist`

### Self-check before SP-10

- [ ] A manager cannot approve a request that does not belong to a direct report.
- [ ] OpenAPI UI shows the full API.
- [ ] The most important business rules have automated tests.

---

# SP-10 — Demo Packaging

**Time estimate:** 2–4 days
**Goal:** Anyone can start the whole system with one command and try the four roles.

### Steps

1. Docker Compose with MongoDB, Keycloak, backend, frontend.
2. Keycloak realm export containing the four demo users (Employee, Manager, HR, Admin).
3. Rich seed data (two countries, several employees, overlapping leaves, holidays…).
4. README that explains how to start and which persona to use for each screen.
5. Optional short demo video.

Commit: `SP-10: docker demo and seed data`

### Final Verification

- `docker compose up`
- Log in as each persona and walk through the main happy paths and one error path.

---

## Coverage of Original Requirements

This section proves that making the roadmap beginner-friendly did not drop any major requirement.

| Requirement area | First introduced | Fully used |
|------------------|------------------|------------|
| Users ≠ Employees | SP-0 / SP-2 | SP-2, SP-7, SP-8 |
| No self-registration | SP-2 | SP-2 |
| Keycloak OIDC + JWT | SP-2 | SP-2 onward |
| Append-only leave ledger | SP-3 | SP-3, SP-4, SP-5, SP-7 |
| Policy resolution by country + date | SP-3 | SP-3, SP-4 |
| Leave request state machine | SP-4 | SP-4, SP-5 |
| Eligibility rules (balance, overlap, active…) | SP-4 | SP-4, SP-5 |
| Manager-of authorisation | SP-5 | SP-5 |
| Computed availability (never stored) | SP-5 | SP-5, SP-6 |
| Two separate status colour systems | SP-4 / SP-5 | SP-4–SP-8 |
| Attendance daily toggle | SP-6 | SP-6 |
| Event-driven notifications | SP-6 | SP-6 |
| HR employee / policy / adjustment screens | SP-7 | SP-7 |
| Dedicated reassign & change-manager | SP-7 | SP-7 |
| Calendar exceptions affect duration | SP-8 | SP-8 |
| Pure admin accounts (employeeId null) | SP-8 | SP-8 |
| Consistent error model & OpenAPI | SP-1 / SP-9 | SP-9 |
| Role + ownership + manager checks on every endpoint | SP-2 / SP-9 | SP-9 |
| Material 3 + density + accessibility | SP-2 / SP-9 | SP-9 |

---

## Final Advice from Mentor to Student

You will feel lost several times. That is normal.

When you feel lost:

1. Re-read only the “Concepts you need right now” section of the current sprint.
2. Make the smallest possible change that moves you forward.
3. Verify it works before adding the next piece.
4. Commit.

The architecture is intentionally strict (layers, append-only ledger, computed availability, separate colour systems).
Those constraints exist so that the system stays understandable when it grows.
You are not only building a student project — you are learning how professional systems are shaped.

Now start with SP-0.
Good luck.
