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

@TargetSystem(id = "leave-management-mongo")
@Change(id = "seed-employees-and-users", author = "ana")
public class _0002__SeedEmployeesAndUsers {

    // Fixed IDs (String) so DummyCurrentUserService can hard-code them
    public static final String EMP_SALMA_ID = "665f00000000000000000031";
    public static final String EMP_AHMED_ID = "665f00000000000000000030";

    public static final String USER_AHMED_ID = "665f00000000000000000040";
    // ← dummy returns this one
    public static final String USER_ADMIN_ID = "665f00000000000000000041";

    public static final String ROLE_EMPLOYEE_ID = "665f00000000000000000001";
    public static final String ROLE_ADMIN_ID = "665f00000000000000000004";

    public static final String DEPT_ENGINEERING_ID = "665f00000000000000000010";
    public static final String POS_BACKEND_ID = "665f00000000000000000020";

    @Apply
    public void apply(MongoDatabase db) {
        seedEmployees(db);
        seedUsers(db);
    }

    @Rollback
    public void rollback(MongoDatabase db) {
        db.getCollection("employees").deleteMany(new Document());
        db.getCollection("users").deleteMany(new Document());
    }

    // -------------------------------------------------------------------------
    // Employees
    // -------------------------------------------------------------------------

    private void seedEmployees(MongoDatabase db) {
        MongoCollection<Document> col = db.getCollection("employees");
        Instant now = Instant.now();

        // Manager – Salma
        col.insertOne(
                new Document("_id", EMP_SALMA_ID).append("employeeNumber", "EMP-00100")
                                                 .append("employmentStatus", "ACTIVE")
                                                 .append("profile", new Document().append(
                                                                                          "firstName", "Salma")
                                                                                  .append("lastName",
                                                                                          "Trabelsi")
                                                                                  .append("gender",
                                                                                          "F")
                                                                                  .append("birthDate",
                                                                                          LocalDate.of(
                                                                                                  1988,
                                                                                                  5,
                                                                                                  12))
                                                                                  .append("email",
                                                                                          "salma.trabelsi@acme.tn")
                                                                                  .append("phone",
                                                                                          "+21620000001")
                                                                                  .append("hireDate",
                                                                                          LocalDate.of(
                                                                                                  2018,
                                                                                                  3,
                                                                                                  1))
                                                                                  .append("departureDate",
                                                                                          null))
                                                 .append("currentAssignment",
                                                         new Document().append(
                                                                               "departmentId",
                                                                               DEPT_ENGINEERING_ID)
                                                                       .append("departmentLabel",
                                                                               "Engineering")
                                                                       .append("positionId",
                                                                               POS_BACKEND_ID)
                                                                       .append("positionLabel",
                                                                               "Backend Developer")
                                                                       .append("startDate",
                                                                               LocalDate.of(
                                                                                       2018,
                                                                                       3,
                                                                                       1))
                                                                       .append("endDate",
                                                                               null))
                                                 .append("assignmentHistory", List.of())
                                                 .append("currentManager", null)
                                                 .append("createdAt", now)
                                                 .append("updatedAt", now));

        // Employee – Ahmed (reports to Salma)
        col.insertOne(
                new Document("_id", EMP_AHMED_ID).append("employeeNumber", "EMP-00231")
                                                 .append("employmentStatus", "ACTIVE")
                                                 .append("profile", new Document().append(
                                                                                          "firstName", "Ahmed")
                                                                                  .append("lastName",
                                                                                          "Ben Salah")
                                                                                  .append("gender",
                                                                                          "M")
                                                                                  .append("birthDate",
                                                                                          LocalDate.of(
                                                                                                  1994,
                                                                                                  3,
                                                                                                  11))
                                                                                  .append("email",
                                                                                          "ahmed.bensalah@acme.tn")
                                                                                  .append("phone",
                                                                                          "+21620000002")
                                                                                  .append("hireDate",
                                                                                          LocalDate.of(
                                                                                                  2020,
                                                                                                  1,
                                                                                                  6))
                                                                                  .append("departureDate",
                                                                                          null))
                                                 .append("currentAssignment",
                                                         new Document().append(
                                                                               "departmentId",
                                                                               DEPT_ENGINEERING_ID)
                                                                       .append("departmentLabel",
                                                                               "Engineering")
                                                                       .append("positionId",
                                                                               POS_BACKEND_ID)
                                                                       .append("positionLabel",
                                                                               "Backend Developer")
                                                                       .append("startDate",
                                                                               LocalDate.of(
                                                                                       2023,
                                                                                       7,
                                                                                       1))
                                                                       .append("endDate",
                                                                               null))
                                                 .append("assignmentHistory", List.of())
                                                 .append("currentManager",
                                                         new Document().append(
                                                                               "employeeId",
                                                                               EMP_SALMA_ID)
                                                                       .append("name",
                                                                               "Salma Trabelsi"))
                                                 .append("createdAt", now)
                                                 .append("updatedAt", now));
    }

    // -------------------------------------------------------------------------
    // Users
    // -------------------------------------------------------------------------

    private void seedUsers(MongoDatabase db) {
        MongoCollection<Document> col = db.getCollection("users");
        Instant linkedAt = Instant.parse("2026-08-01T08:12:00Z");

        // Linked employee user (Ahmed) – this is what the dummy returns
        col.insertOne(new Document("_id", USER_AHMED_ID).append("email",
                                                                "ahmed.bensalah@acme.tn")
                                                        .append("employeeId",
                                                                EMP_AHMED_ID)
                                                        .append("accountStatus", "ACTIVE")
                                                        .append("identity",
                                                                new Document().append(
                                                                                      "provider",
                                                                                      "KEYCLOAK")
                                                                              .append("subject",
                                                                                      "f3a1c9e2-keycloak-sub-for-ahmed")
                                                                              .append("linkedAt",
                                                                                      linkedAt))
                                                        .append("role",
                                                                new Document().append(
                                                                                      "id",
                                                                                      ROLE_EMPLOYEE_ID)
                                                                              .append("code",
                                                                                      "EMPLOYEE"))
                                                        .append("lastLoginAt",
                                                                Instant.parse(
                                                                        "2026-08-15T07:58:00Z"))
                                                        .append("createdAt", linkedAt)
                                                        .append("updatedAt", linkedAt));

        // Pure admin (no employee link)
        col.insertOne(new Document("_id", USER_ADMIN_ID).append("email", "admin@acme.tn")
                                                        .append("employeeId", null)
                                                        .append("accountStatus", "ACTIVE")
                                                        .append("identity",
                                                                new Document().append(
                                                                                      "provider",
                                                                                      "KEYCLOAK")
                                                                              .append("subject",
                                                                                      "admin-keycloak-sub")
                                                                              .append("linkedAt",
                                                                                      linkedAt))
                                                        .append("role",
                                                                new Document().append(
                                                                                      "id",
                                                                                      ROLE_ADMIN_ID)
                                                                              .append("code",
                                                                                      "ADMIN"))
                                                        .append("lastLoginAt", linkedAt)
                                                        .append("createdAt", linkedAt)
                                                        .append("updatedAt", linkedAt));
    }
}
