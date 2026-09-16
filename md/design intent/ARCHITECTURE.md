---
title: ARCHITECTURE
lastUpdated: Thu, Sep 3 • 2:35 PM
created: Sat, Aug 29 • 7:23 PM
---
Architecture — Leave & Workforce API

Onboarding guide for developers joining this codebase.

---

## 1. What This Codebase Looks like

This is a **Spring Boot REST API** for leave, attendance, and workforce management. Persistence is **MongoDB**. Auth is intended to be **Keycloak OIDC (JWT)**; today a dev header stands in until that is wired.

The project follows a strict **layered architecture**:

```
HTTP request
    ↓
Controller   (API boundary, DTOs only)
    ↓
Service      (business rules, transactions)
    ↓
Repository   (Spring Data MongoDB)
    ↓
MongoDB documents (entities)
```

DTOs and mappers sit at the edges of the service layer:

```
Request DTO  →  Controller  →  Mapper.toEntity / service call
                                      ↓
                                   Entity
                                      ↓
                                 Repository

Response DTO  ←  Mapper.toResponse  ←  Service result
```

**Mental model:** controllers speak HTTP and DTOs; services speak domain entities and rules; repositories speak MongoDB. Nothing skips a layer. Entities never appear in controller method signatures.

---

## 2. Package Structure

Root package: `com.acme.leave`.

| Package | Responsibility |
|---------|----------------|
| `controllers/` | REST endpoints, validation annotations, status codes. Grouped by **caller context** (see §4). |
| `services/` + `services/impl/` | Business logic. Interfaces + implementations. `@Transactional` lives here. |
| `repositories/` | Spring Data `MongoRepository` interfaces. Queries only—no business rules. |
| `domain/entities/` | MongoDB document models (`@Document`). Embedded value objects under `entities/embedded/`. |
| `domain/dtos/` | API shapes: `request/`, `response/`, `common/` (pagination, error envelope). |
| `domain/enums/` | Closed status and code enums shared across layers. |
| `domain/events/` | Spring application events (e.g. leave status changed → notifications). |
| `mappers/` | MapStruct interfaces: entity ↔ DTO. No business logic. |
| `exception/` | Domain exceptions + `GlobalExceptionHandler` (uniform error JSON). |
| `security/` | Resolves the current application user from the request. |
| `config/` | Security filter chain, OpenAPI, async. |
| `mongock/` | Database migrations / seed (`@ChangeUnit`). Runs once, tracked by Mongock. |

**Why this split:** each concern has one home. You always know where to put a new class and where *not* to put logic (e.g. never in a mapper or controller).

---

## 3. How Features Are Structured

Every capability is built as a vertical slice that repeats the same shape:

1. **Entity** — persisted shape (fields, indexes, embedded documents).
2. **Repository** — `findBy…`, `existsBy…`, list queries.
3. **DTOs** — separate request and response types; never reuse one for both.
4. **Mapper** — MapStruct `toEntity` / `toResponse` / optional `updateEntity`.
5. **Service** — interface + `impl`; eligibility, state machines, ledger append, ownership checks.
6. **Controller** — map request → service → map response; return `ResponseEntity`.

**Who does what**

- **Controllers** — HTTP method, path, `@Valid`, auth context resolution, status codes.
- **Services** — all business rules (eligibility, status transitions, balance, manager-of).
- **Repositories** — persistence and queries only.
- **Entities** — what is stored; may hold fields the API never exposes.
- **DTOs** — what the client may send or see.
- **Mappers** — mechanical translation between DTO and entity.

Separation exists so rules stay testable without HTTP, the API surface stays stable when storage changes, and mass-assignment of protected fields is avoided.

---

## 4. How Controllers Are Organized

Controllers are **not** one-per-entity. They are grouped by **who is acting**:

| Package | Base path | Intent |
|---------|-----------|--------|
| `controllers/me/` | `/api/v1/me/...` | Authenticated self-service (profile, own leave, attendance, notifications). |
| `controllers/manager/` | `/api/v1/manager/...` | Manager acting on direct reports (team, approve/reject, availability). |
| `controllers/hr/` | `/api/v1/hr/...` | HR org-wide tools (employees, policies, adjustments, leave overview). |
| `controllers/admin/` | `/api/v1/admin/...` | System setup (users, roles, departments, positions, org settings). |

Same underlying entities can surface in several contexts with different authorization and fields. Example: leave requests appear under `/me` (owner), `/manager` (approver), and `/hr` (read-only overview).

When adding an endpoint, pick the package that matches the **actor**, not only the collection name.

---

## 5. Security (Current and iNtended)

**Today (dev):** `SecurityConfig` permits `/api/v1/**`. Identity comes from header `X-User-Email`, resolved by `CurrentUserService` into a `User` document. No Keycloak yet.

**Intended (Keycloak OIDC):**

1. Enable OAuth2 Resource Server JWT validation (`issuer-uri` / JWKS).
2. Client obtains tokens from Keycloak (Google broker optional).
3. Every request: `Authorization: Bearer <access_token>`.
4. After signature validation, load `users` by token `sub` (and email on first login for linking).
5. **Application role** is read from `users.role` in MongoDB—not from Keycloak claims.
6. Controllers / services keep using `CurrentUserService` (implementation swaps from header to JWT principal).
7. No public registration; admin creates the user row first; first successful login links `identity.subject`.

Authorization remains: JWT valid → application role → resource ownership (`/me`) or manager-of (`currentManager`) or role-only (HR/Admin).

---

## 6. Cross-cutting Concerns

| Concern | Where |
|---------|--------|
| Errors | `exception/` — `BusinessException` + codes (`INSUFFICIENT_BALANCE`, etc.); `GlobalExceptionHandler` maps everything to a stable JSON error body. |
| Pagination | `PageResponse` + `PaginationMeta` for list endpoints. |
| Transactions | Service methods: `@Transactional` on writes, `readOnly = true` on class or reads. |
| Side effects | Domain events (e.g. leave status change) → async listeners create in-app notifications and optionally email. Leave services do not write notification documents themselves. |
| Schema / seed | Mongock `@ChangeUnit` under `mongock/` (not ad-hoc runners). |
| API docs | springdoc; `OpenApiConfig` defines Bearer scheme for the future JWT path. |

---

## 7. Development Approach

Features were built as **vertical slices**: finish one capability end-to-end before starting the next.

Within a slice, preferred order:

1. Entity
2. Repository
3. DTOs
4. Mapper
5. Service interface + implementation
6. Controller in the right context package

That order matches compile-time dependencies and delivers a testable path through the system quickly, instead of incomplete horizontal layers.

---

## 8. Conventions to Follow

- Business rules live in **services**, not controllers or mappers.
- Controllers stay thin: validate → resolve user → call service → map response.
- Never expose entities on the wire; always DTOs.
- Mapping only via MapStruct mappers (`componentModel = "spring"`).
- Append-only patterns where the domain requires them (e.g. leave ledger movements)—do not “edit balance.”
- Repositories do not encode business policy (eligibility, state machines).
- Use existing exception types and error codes; do not invent ad-hoc error JSON.
- Put new controllers under `admin` / `hr` / `manager` / `me` according to actor.
- Prefer publishing domain events for notifications and similar side effects.
- New reference data or schema changes go through a new Mongock change unit with a unique id and order.

---

## 9. How to Add a New Feature

1. Identify the domain concept and the **actor** (me / manager / hr / admin).
2. Add or extend the **entity** (and embedded types if needed).
3. Add the **repository**.
4. Define **request/response DTOs** (separate shapes).
5. Add a **MapStruct mapper**.
6. Implement **service** interface + impl (rules, transactions, events).
7. Add a **controller** under the matching context package.
8. Reuse `CurrentUserService`, exception types, and pagination/error envelopes.
9. If seed or indexes change, add a Mongock `@ChangeUnit`.

Compile, hit the endpoint via Swagger or curl with `X-User-Email` (until JWT is enabled), then commit a small milestone.

---

*This document describes patterns reflected in the current tree under `com.acme.leave`. Prefer matching existing code over inventing parallel styles.*
