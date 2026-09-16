# PROJECT_ENGINEERING_GUIDE
### Leave & Workforce Management System

This is the durable entry point for Antigravity (and humans).  
It combines the **live repository**, the **architecture documents**, and the **sprint roadmap**.

---

## 1. Project purpose

A multi-actor leave and workforce system:

| Actor | Cares about |
|-------|-------------|
| Employee | Request leave, see balance, mark daily presence |
| Manager | Approve/reject direct reports, see team availability |
| HR | Manage people, policies, adjustments, org-wide view |
| System Admin | Users, roles, org settings, calendars |

Two permanent design choices:

1. **Users and Employees are separate**
2. **Leave balance is an append-only ledger**

---

## 2. Repository structure (inspect live tree)

Typical monorepo layout:

```text
/
├── backend/          Spring Boot + MongoDB
├── frontend/         Angular + Material
├── docker-compose.yml
├── ARCHITECTURE.md
├── CODEBASE_GUIDE.md
├── BEGINNER-GUIDED-SPRINT-ROADMAP.md
├── EMPLOYEE-LOGIN-PROVISIONING.md
└── ...
```

Always confirm package root and controller packages in the actual workspace.

---

## 3. Architecture (target shape from docs)

```
HTTP → Controller (actor package, DTOs only)
         → Service (rules, transactions, events)
           → Repository
             → MongoDB entities
```

- MapStruct between DTOs and entities
- Global exception handler → stable error JSON
- Domain events for leave status changes → notifications / email
- Migrations via Mongock / Flamingock (not ad-hoc runners)

Controllers are grouped by **actor**:

- `me` — self-service
- `manager` — direct reports
- `hr` — org-wide employment & policy
- `admin` — accounts, catalogs, settings, calendars

---

## 4. Backend conventions (summary)

See skill `backend-conventions` for details.

- Vertical slice: Entity → Repository → DTOs → Mapper → Service → Controller
- Never expose entities on the API
- Business rules only in services
- Append-only ledger movements
- Manager-of checks for approvals
- Computed availability (never stored)

---

## 5. Frontend conventions (summary)

See skill `frontend-conventions`.

- Angular + Material; reuse existing shell and theme
- Auth via Keycloak (Google broker when configured)
- Employment/ACTIVE status from `/me`, not from “has JWT” alone
- Two separate colour systems (request lifecycle vs availability)
- HR leave views are read-only for approval

---

## 6. API & security model

- Resource server validates JWT from Keycloak
- Application resolves User; optional link to Employee
- Authorization = role + ownership + manager-of + ACTIVE where required
- No public self-registration in the intended model
- See `EMPLOYEE-LOGIN-PROVISIONING.md` and skill `security-conventions`

---

## 7. Domain model (high level)

| Concept | Meaning |
|---------|---------|
| User | Account (email, identity subject, role, status). May have no employee. |
| Employee | Employment record (profile, assignment, manager, status). May exist before login. |
| LeaveType / LeavePolicy | Catalog + versioned rules (country, effective dates, accrual). |
| LeaveRequest | Demand with state machine + frozen employee snapshot. |
| LeaveLedger + movements | Per employee / type / year balance book (append-only). |
| Attendance | Daily presence for one employee on one date. |
| Notification | Inbox item for a **user** (account). |
| OrganizationSettings | Singleton (country, timezone, weekend days). |
| Calendar / CalendarDay | Public holidays and special days (affect duration). |

Full lifecycles and operation traces: see `CODEBASE_GUIDE.md`.

---

## 8. Email & notifications

- Leave services publish domain events on status change
- Listeners create in-app notifications (and optionally email)
- Leave success must not depend on notification delivery

---

## 9. Docker / local development

Typical services (confirm in `docker-compose.yml`):

- MongoDB (often replica set for transactions)
- Keycloak
- MailHog
- Mongo Express (optional)
- Backend + Frontend (sometimes also containerized)

Use the project README for exact ports and start commands.

---

## 10. Testing conventions

- Follow whatever already exists in the tree
- Prefer tests that protect business rules: eligibility, state transitions, ledger append, manager-of
- Integration tests with Mongo when present
- Frontend: component/service tests for critical forms and guards

---

## 11. Development approach

From the architecture and sprint docs:

- Build **vertical slices**, not incomplete horizontal layers
- Prefer small milestones with verification after each step
- Use the beginner sprint roadmap (SP-0 … SP-10) as a learning path when implementing from scratch or filling gaps
- Record important decisions in short ADRs when they affect future work

---

## 12. Known limitations & inconsistencies

Maintain these in `PROJECT_STATUS.md`. Typical categories:

- Design docs vs live package names / completeness
- JWT roles vs DB role as source of truth
- Incomplete leave-request services or UI screens
- History fields present on entities but not fully maintained by APIs
- Calendar not yet applied to duration in some versions

Always re-check the live code before assuming a gap is fixed.

---

## 13. Important architectural decisions (examples)

Record real decisions as ADRs when they matter. Starter themes:

- Users separate from Employees
- Append-only leave ledger
- Actor-based controllers
- Availability computed, not stored
- Notifications via events, not direct writes from leave service
- Keycloak authenticates; app DB decides employment access

---

## 14. Links to skills

| Skill | Location |
|-------|----------|
| Project overview | `.agents/skills/project-overview/` (or project skills folder) |
| Backend conventions | `backend-conventions/` |
| Frontend conventions | `frontend-conventions/` |
| Security conventions | `security-conventions/` |

---

## 15. How future feature work must proceed

1. Read this guide + relevant skills
2. Inspect live implementation
3. Identify current vs desired behavior
4. Produce task list / Implementation Plan when multi-file or security-related
5. Implement the smallest coherent vertical slice
6. Verify (API + tests + browser when UI)
7. Update `PROJECT_STATUS.md`
8. Update this guide only if a real convention changed

Do not invent a parallel architecture for one feature.
