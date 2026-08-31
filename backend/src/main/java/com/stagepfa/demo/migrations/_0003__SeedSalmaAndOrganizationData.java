package com.stagepfa.demo.migrations;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import io.flamingock.api.annotations.Apply;
import io.flamingock.api.annotations.Change;
import io.flamingock.api.annotations.Rollback;
import io.flamingock.api.annotations.TargetSystem;
import org.bson.Document;

import java.time.Instant;

@TargetSystem(id = "leave-management-mongo")
@Change(id = "seed-salma-and-organization-data", author = "ana")
public class _0003__SeedSalmaAndOrganizationData {

    public static final String USER_SALMA_ID = "665f00000000000000000042";

    public static final String EMP_SALMA_ID = "665f00000000000000000031";

    public static final String DEPT_ENGINEERING_ID = "665f00000000000000000010";

    public static final String POS_BACKEND_ID = "665f00000000000000000020";

    public static final String ROLE_EMPLOYEE_ID = "665f00000000000000000001";

    @Apply
    public void apply(MongoDatabase db) {
        seedDepartmentsAndPositions(db);
        seedSalmaUser(db);
    }

    @Rollback
    public void rollback(MongoDatabase db) {
        db.getCollection("users").deleteOne(new Document("_id", USER_SALMA_ID));

        db.getCollection("positions").deleteOne(new Document("_id", POS_BACKEND_ID));

        db.getCollection("departments")
          .deleteOne(new Document("_id", DEPT_ENGINEERING_ID));
    }

    private void seedDepartmentsAndPositions(MongoDatabase db) {
        Instant now = Instant.now();

        MongoCollection<Document> departments = db.getCollection("departments");

        departments.insertOne(
                new Document("_id", DEPT_ENGINEERING_ID).append("label", "Engineering")
                                                        .append("createdAt", now));

        MongoCollection<Document> positions = db.getCollection("positions");

        positions.insertOne(new Document("_id", POS_BACKEND_ID).append("code", "BE-DEV")
                                                               .append("title",
                                                                       "Backend Developer")
                                                               .append("description",
                                                                       "Spring Boot / Mongo")
                                                               .append("createdAt", now)
                                                               .append("updatedAt", now));
    }

    private void seedSalmaUser(MongoDatabase db) {
        MongoCollection<Document> col = db.getCollection("users");

        Instant linkedAt = Instant.parse("2026-08-01T08:12:00Z");

        col.insertOne(new Document("_id", USER_SALMA_ID).append("email",
                                                                "salma.trabelsi@acme.tn")
                                                        .append("employeeId",
                                                                EMP_SALMA_ID)
                                                        .append("accountStatus", "ACTIVE")
                                                        .append("identity",
                                                                new Document().append(
                                                                                      "provider",
                                                                                      "KEYCLOAK")
                                                                              .append("subject",
                                                                                      "salma-keycloak-sub")
                                                                              .append("linkedAt",
                                                                                      linkedAt))
                                                        .append("role",
                                                                new Document().append(
                                                                                      "id",
                                                                                      ROLE_EMPLOYEE_ID)
                                                                              .append("code",
                                                                                      "MANAGER"))
                                                        .append("lastLoginAt", linkedAt)
                                                        .append("createdAt", linkedAt)
                                                        .append("updatedAt", linkedAt));
    }
}
