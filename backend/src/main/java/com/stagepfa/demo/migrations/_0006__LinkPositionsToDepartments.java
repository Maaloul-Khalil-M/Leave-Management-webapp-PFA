package com.stagepfa.demo.migrations;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import io.flamingock.api.annotations.Apply;
import io.flamingock.api.annotations.Change;
import io.flamingock.api.annotations.Rollback;
import io.flamingock.api.annotations.TargetSystem;
import org.bson.Document;
import org.bson.conversions.Bson;

import static com.stagepfa.demo.migrations._0001__SeedReferenceData.*;

/**
 * STEP 6 — Link existing seeded positions to their corresponding departments.
 */
@TargetSystem(id = "leave-management-mongo")
@Change(id = "0006-link-positions-to-departments", author = "antigravity")
public class _0006__LinkPositionsToDepartments {

    @Apply
    public void apply(MongoDatabase db) {
        MongoCollection<Document> positions = db.getCollection("positions");
        MongoCollection<Document> employees = db.getCollection("employees");

        // 1. Explicit mappings for known reference seeds
        linkPosition(positions, POS_BACKEND_ID, "BE_DEV", DEPT_ENGINEERING_ID);
        linkPosition(positions, POS_FRONTEND_ID, "FE_DEV", DEPT_ENGINEERING_ID);
        linkPosition(positions, POS_ENGINEERING_MANAGER_ID, "ENG_MGR", DEPT_ENGINEERING_ID);
        linkPosition(positions, POS_HR_SPECIALIST_ID, "HR_SPEC", DEPT_HR_ID);
        linkPosition(positions, POS_FINANCE_ANALYST_ID, "FIN_AN", DEPT_FINANCE_ID);

        // 2. Backfill any unlinked position using employee current assignments
        for (Document pos : positions.find(Filters.or(
                Filters.exists("departmentId", false),
                Filters.eq("departmentId", null),
                Filters.eq("departmentId", "")
        ))) {
            String posId = pos.getString("_id");
            if (posId != null) {
                Document emp = employees.find(Filters.eq("currentAssignment.positionId", posId)).first();
                if (emp != null) {
                    Document assignment = emp.get("currentAssignment", Document.class);
                    if (assignment != null && assignment.getString("departmentId") != null) {
                        positions.updateOne(
                                Filters.eq("_id", posId),
                                Updates.set("departmentId", assignment.getString("departmentId"))
                        );
                    }
                }
            }
        }
    }

    @Rollback
    public void rollback(MongoDatabase db) {
        MongoCollection<Document> positions = db.getCollection("positions");
        positions.updateMany(
                Filters.exists("departmentId", true),
                Updates.unset("departmentId")
        );
    }

    private void linkPosition(MongoCollection<Document> col, String id, String code, String departmentId) {
        Bson filter = Filters.or(
                Filters.eq("_id", id),
                Filters.eq("code", code)
        );
        col.updateMany(filter, Updates.set("departmentId", departmentId));
    }
}
