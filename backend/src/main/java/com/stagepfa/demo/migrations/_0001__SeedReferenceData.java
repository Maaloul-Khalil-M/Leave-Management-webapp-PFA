package com.stagepfa.demo.migrations;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import io.flamingock.api.annotations.Apply;
import io.flamingock.api.annotations.Change;
import io.flamingock.api.annotations.Rollback;
import io.flamingock.api.annotations.TargetSystem;
import org.bson.Document;

import java.time.Instant;
import java.util.List;

/**
 * STEP 1 — Foundation: organization_settings, departments, positions.
 *
 * Fixed IDs so later seeds and DummyCurrentUserService can hard-reference them.
 * Idempotent: each block skips if the collection already has documents.
 */
@TargetSystem(id = "leave-management-mongo")
@Change(id = "0001-seed-reference-data", author = "ana")
public class _0001__SeedReferenceData {

    // ---- Organization ----
    public static final String ORG_SETTINGS_ID = "665f00000000000000000050";

    // ---- Departments ----
    public static final String DEPT_ENGINEERING_ID = "665f00000000000000000010";
    public static final String DEPT_HR_ID          = "665f00000000000000000011";
    public static final String DEPT_FINANCE_ID     = "665f00000000000000000012";
    public static final String DEPT_OPERATIONS_ID  = "665f00000000000000000013";

    // ---- Positions ----
    public static final String POS_BACKEND_ID             = "665f00000000000000000020";
    public static final String POS_FRONTEND_ID            = "665f00000000000000000021";
    public static final String POS_HR_SPECIALIST_ID       = "665f00000000000000000022";
    public static final String POS_ENGINEERING_MANAGER_ID = "665f00000000000000000023";
    public static final String POS_FINANCE_ANALYST_ID     = "665f00000000000000000024";

    @Apply
    public void apply(MongoDatabase db) {
        seedOrganizationSettings(db);
        seedDepartments(db);
        seedPositions(db);
    }

    @Rollback
    public void rollback(MongoDatabase db) {
        db.getCollection("positions").deleteMany(new Document());
        db.getCollection("departments").deleteMany(new Document());
        db.getCollection("organization_settings").deleteMany(new Document());
    }

    // -------------------------------------------------------------------------
    // organization_settings (singleton)
    // -------------------------------------------------------------------------
    private void seedOrganizationSettings(MongoDatabase db) {
        MongoCollection<Document> col = db.getCollection("organization_settings");
        if (col.countDocuments() > 0) {
            return;
        }
        Instant now = Instant.now();

        // weekendDays: ISO-8601 — 1=Mon … 7=Sun → Sat=6, Sun=7
        col.insertOne(new Document("_id", ORG_SETTINGS_ID)
                .append("companyName", "ACME Tunisia")
                .append("country", "TN")
                .append("weekendDays", List.of(6, 7))
                .append("createdAt", now)
                .append("updatedAt", now));
    }

    // -------------------------------------------------------------------------
    // departments
    // -------------------------------------------------------------------------
    private void seedDepartments(MongoDatabase db) {
        MongoCollection<Document> col = db.getCollection("departments");
        if (col.countDocuments() > 0) {
            return;
        }
        Instant now = Instant.now();

        col.insertMany(List.of(
                dept(DEPT_ENGINEERING_ID, "Engineering", now),
                dept(DEPT_HR_ID, "Human Resources", now),
                dept(DEPT_FINANCE_ID, "Finance", now),
                dept(DEPT_OPERATIONS_ID, "Operations", now)
        ));
    }

    // -------------------------------------------------------------------------
    // positions
    // -------------------------------------------------------------------------
    private void seedPositions(MongoDatabase db) {
        MongoCollection<Document> col = db.getCollection("positions");
        if (col.countDocuments() > 0) {
            return;
        }
        Instant now = Instant.now();

        col.insertMany(List.of(
                pos(POS_BACKEND_ID, "BE_DEV", "Backend Developer",
                        "Java / Spring backend engineer", now),
                pos(POS_FRONTEND_ID, "FE_DEV", "Frontend Developer",
                        "Angular frontend engineer", now),
                pos(POS_HR_SPECIALIST_ID, "HR_SPEC", "HR Specialist",
                        "Human resources specialist", now),
                pos(POS_ENGINEERING_MANAGER_ID, "ENG_MGR", "Engineering Manager",
                        "Engineering team lead", now),
                pos(POS_FINANCE_ANALYST_ID, "FIN_AN", "Finance Analyst",
                        "Financial analysis and reporting", now)
        ));
    }

    // ---- helpers ----
    private static Document dept(String id, String label, Instant now) {
        return new Document("_id", id)
                .append("label", label)
                .append("createdAt", now)
                .append("updatedAt", now);
    }

    private static Document pos(String id, String code, String title, String description, Instant now) {
        return new Document("_id", id)
                .append("code", code)
                .append("title", title)
                .append("description", description)
                .append("createdAt", now)
                .append("updatedAt", now);
    }
}
