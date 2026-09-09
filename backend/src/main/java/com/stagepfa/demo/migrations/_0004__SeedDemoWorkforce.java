package com.stagepfa.demo.migrations;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import io.flamingock.api.annotations.Apply;
import io.flamingock.api.annotations.Change;
import io.flamingock.api.annotations.Rollback;
import io.flamingock.api.annotations.TargetSystem;
import org.bson.Document;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static com.stagepfa.demo.migrations._0001__SeedReferenceData.*;

/**
 * STEP 4 — Demo workforce: employees + users.
 * <p>
 * Hierarchy:
 * Salma (Engineering Manager, TN) manages:
 * - Ahmed  (Backend, TN)
 * - Yosra  (Frontend, TN)
 * - Karim  (Backend, TN)   — dual-country demo
 * - Camille (Frontend, FR) — dual-country demo
 * Leila (HR Specialist, TN) — standalone
 * Pure ADMIN user (no employee link)
 * <p>
 * Login emails (dev):
 * salma@acme.tn | ahmed@acme.tn | yosra@acme.tn | leila@acme.tn
 * karim@acme.tn | camille@acme.fr | admin@acme.tn
 * <p>
 * Idempotent: guarded on employeeNumber "MGR-001".
 */
@TargetSystem(id = "leave-management-mongo")
@Change(id = "0004-seed-demo-workforce", author = "ana")
public class _0004__SeedDemoWorkforce {

    // ---- Core team ----
    public static final String EMP_SALMA_ID = "665f00000000000000000031";
    public static final String EMP_AHMED_ID = "665f00000000000000000030";
    public static final String EMP_YOSRA_ID = "665f00000000000000000032";
    public static final String EMP_LEILA_ID = "665f00000000000000000033";

    // ---- Dual-country demo ----
    public static final String EMP_KARIM_ID = "665f000000000000000000c0";
    public static final String EMP_CAMILLE_ID = "665f000000000000000000c1";

    // ---- Users ----
    public static final String USER_SALMA_ID = "665f00000000000000000042";
    public static final String USER_AHMED_ID = "665f00000000000000000040";
    public static final String USER_YOSRA_ID = "665f00000000000000000043";
    public static final String USER_LEILA_ID = "665f00000000000000000044";
    public static final String USER_ADMIN_ID = "665f00000000000000000041";
    public static final String USER_KARIM_ID = "665f000000000000000000c2";
    public static final String USER_CAMILLE_ID = "665f000000000000000000c3";

    @Apply
    public void apply(MongoDatabase db) {
        MongoCollection<Document> employees = db.getCollection("employees");
        if (employees.countDocuments(new Document("employeeNumber", "MGR-001")) > 0) {
            return;
        }
        Instant now = Instant.now();
        seedEmployees(db, now);
        seedUsers(db, now);
    }

    @Rollback
    public void rollback(MongoDatabase db) {
        db.getCollection("users")
          .deleteMany(new Document());
        db.getCollection("employees")
          .deleteMany(new Document());
    }

    // -------------------------------------------------------------------------
    // Employees
    // -------------------------------------------------------------------------
    private void seedEmployees(MongoDatabase db, Instant now) {
        MongoCollection<Document> col = db.getCollection("employees");

        // ---- Manager: Salma ----
        col.insertOne(employee(EMP_SALMA_ID, "MGR-001", "ACTIVE",
                               profile("Salma", "Trabelsi", "F",
                                       LocalDate.of(1988, 4, 12), "maaloul.mk5@gmail.com",
                                       "+21620000001", LocalDate.of(2018, 3, 1)),
                               assignment(DEPT_ENGINEERING_ID, "Engineering",
                                          POS_ENGINEERING_MANAGER_ID,
                                          "Engineering Manager", LocalDate.of(2022, 1, 1),
                                          "TN"), null, now));

        // ---- Ahmed (Backend, reports to Salma) ----
        col.insertOne(employee(EMP_AHMED_ID, "EMP-001", "ACTIVE",
                               profile("Ahmed", "Ben Salah", "M",
                                       LocalDate.of(1994, 3, 11),
                                       "sadkoni.rani.marj@gmail.com", "+21620000002",
                                       LocalDate.of(2020, 1, 6)),
                               assignment(DEPT_ENGINEERING_ID, "Engineering",
                                          POS_BACKEND_ID, "Backend Developer",
                                          LocalDate.of(2023, 7, 1), "TN"),
                               managerRef(EMP_SALMA_ID, "Salma Trabelsi"), now));

        // ---- Yosra (Frontend, reports to Salma) — similar to Ahmed, different name/email ----
        col.insertOne(employee(EMP_YOSRA_ID, "EMP-002", "ACTIVE",
                               profile("Yosra", "Khelifi", "F", LocalDate.of(1996, 8, 20),
                                       "rrmana3rech@gmail.com", "+21620000003",
                                       LocalDate.of(2021, 9, 1)),
                               assignment(DEPT_ENGINEERING_ID, "Engineering",
                                          POS_FRONTEND_ID, "Frontend Developer",
                                          LocalDate.of(2021, 9, 1), "TN"),
                               managerRef(EMP_SALMA_ID, "Salma Trabelsi"), now));

        // ---- Leila (HR, standalone) ----
        col.insertOne(employee(EMP_LEILA_ID, "HR-001", "ACTIVE",
                               profile("Leila", "Mansouri", "F",
                                       LocalDate.of(1990, 1, 15), "leila@acme.tn",
                                       "+21620000004", LocalDate.of(2019, 6, 1)),
                               assignment(DEPT_HR_ID, "Human Resources",
                                          POS_HR_SPECIALIST_ID, "HR Specialist",
                                          LocalDate.of(2019, 6, 1), "TN"), null, now));

        // ---- Karim (TN site, similar role to Ahmed) ----
        col.insertOne(employee(EMP_KARIM_ID, "EMP-TN-001", "ACTIVE",
                               profile("Karim", "Ben Ammar", "M",
                                       LocalDate.of(1992, 5, 14), "karim@acme.tn",
                                       "+21620000010", LocalDate.of(2019, 2, 1)),
                               assignment(DEPT_ENGINEERING_ID, "Engineering",
                                          POS_BACKEND_ID, "Backend Developer",
                                          LocalDate.of(2019, 2, 1), "TN"),
                               managerRef(EMP_SALMA_ID, "Salma Trabelsi"), now));

        // ---- Camille (FR site, similar role to Yosra) ----
        col.insertOne(employee(EMP_CAMILLE_ID, "EMP-FR-001", "ACTIVE",
                               profile("Camille", "Dupont", "F",
                                       LocalDate.of(1990, 11, 3), "camille@acme.fr",
                                       "+33140000020", LocalDate.of(2017, 6, 15)),
                               assignment(DEPT_ENGINEERING_ID, "Engineering",
                                          POS_FRONTEND_ID, "Frontend Developer",
                                          LocalDate.of(2017, 6, 15), "FR"),
                               managerRef(EMP_SALMA_ID, "Salma Trabelsi"), now));
    }

    // -------------------------------------------------------------------------
    // Users
    // -------------------------------------------------------------------------
    private void seedUsers(MongoDatabase db, Instant now) {
        MongoCollection<Document> col = db.getCollection("users");

        col.insertOne(user(USER_SALMA_ID, "maaloul.mk5@gmail.com", EMP_SALMA_ID, now));
        col.insertOne(
                user(USER_AHMED_ID, "sadkoni.rani.marj@gmail.com", EMP_AHMED_ID, now));
        col.insertOne(user(USER_YOSRA_ID, "rrmana3rech@gmail.com", EMP_YOSRA_ID, now));
        col.insertOne(user(USER_LEILA_ID, "leila@acme.tn", EMP_LEILA_ID, now));
        col.insertOne(user(USER_KARIM_ID, "karim@acme.tn", EMP_KARIM_ID, now));
        col.insertOne(user(USER_CAMILLE_ID, "camille@acme.fr", EMP_CAMILLE_ID, now));
        // Pure admin — no employee link
        col.insertOne(user(USER_ADMIN_ID, "admin@acme.tn", null, now));
    }

    // -------------------------------------------------------------------------
    // Builders (match domain entities exactly)
    // -------------------------------------------------------------------------
    private static Document employee(String id, String number, String status,
                                     Document profile, Document assignment,
                                     Document manager, Instant now) {
        return new Document("_id", id).append("employeeNumber", number)
                                      .append("employmentStatus", status)
                                      .append("profile", profile)
                                      .append("currentAssignment", assignment)
                                      .append("assignmentHistory", List.of())
                                      .append("currentManager", manager)
                                      .append("createdAt", now)
                                      .append("updatedAt", now);
    }

    private static Document profile(String first, String last, String gender,
                                    LocalDate birth, String email, String phone,
                                    LocalDate hire) {
        return new Document().append("firstName", first)
                             .append("lastName", last)
                             .append("gender", gender)
                             .append("birthDate", birth)
                             .append("email", email)
                             .append("phone", phone)
                             .append("hireDate", hire)
                             .append("departureDate", null);
    }

    private static Document assignment(String deptId, String deptLabel, String posId,
                                       String posLabel, LocalDate start,
                                       String countryCode) {
        return new Document().append("departmentId", deptId)
                             .append("departmentLabel", deptLabel)
                             .append("positionId", posId)
                             .append("positionLabel", posLabel)
                             .append("startDate", start)
                             .append("endDate", null)
                             .append("countryCode", countryCode);
    }

    private static Document managerRef(String employeeId, String name) {
        return new Document().append("employeeId", employeeId)
                             .append("name", name);
    }

    private static Document user(String id, String email, String employeeId,
                                 Instant now) {
        return new Document("_id", id).append("email", email)
                                      .append("employeeId", employeeId)
                                      .append("accountStatus", "ACTIVE")
                                      .append("createdAt", now)
                                      .append("updatedAt", now);
    }
}
