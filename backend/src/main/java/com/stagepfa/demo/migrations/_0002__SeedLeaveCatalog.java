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
 * STEP 2 — Leave catalog: leave_types + leave_policies (TN + FR).
 *
 * Aligns with domain entities LeaveType / LeavePolicy and Tunisian Labour Code
 * Arts. 112-116 / Art. 20 / Art. 64 + FR Code du travail L3141 / L1226 / L1225.
 *
 * Both countries are seeded so policy resolution by country works without
 * code changes. Idempotent: skips if collections already have data.
 */
@TargetSystem(id = "leave-management-mongo")
@Change(id = "0002-seed-leave-catalog", author = "ana")
public class _0002__SeedLeaveCatalog {

    // ---- Leave types ----
    public static final String LEAVE_TYPE_ANNUAL_ID    = "665f00000000000000000060";
    public static final String LEAVE_TYPE_SICK_ID      = "665f00000000000000000061";
    public static final String LEAVE_TYPE_UNPAID_ID    = "665f00000000000000000062";
    public static final String LEAVE_TYPE_MATERNITY_ID = "665f00000000000000000063";

    // ---- TN policies ----
    public static final String POLICY_TN_ANNUAL_ID    = "665f00000000000000000070";
    public static final String POLICY_TN_SICK_ID      = "665f00000000000000000071";
    public static final String POLICY_TN_UNPAID_ID    = "665f00000000000000000072";
    public static final String POLICY_TN_MATERNITY_ID = "665f00000000000000000073";

    // ---- FR policies ----
    public static final String POLICY_FR_ANNUAL_ID    = "665f00000000000000000080";
    public static final String POLICY_FR_SICK_ID      = "665f00000000000000000081";
    public static final String POLICY_FR_UNPAID_ID    = "665f00000000000000000082";
    public static final String POLICY_FR_MATERNITY_ID = "665f00000000000000000083";

    @Apply
    public void apply(MongoDatabase db) {
        seedLeaveTypes(db);
        seedLeavePolicies(db);
    }

    @Rollback
    public void rollback(MongoDatabase db) {
        db.getCollection("leave_policies").deleteMany(new Document());
        db.getCollection("leave_types").deleteMany(new Document());
    }

    // -------------------------------------------------------------------------
    // leave_types  (matches LeaveType entity: code, label, requiresProof,
    //               deductsFromBalance, isActive)
    // -------------------------------------------------------------------------
    private void seedLeaveTypes(MongoDatabase db) {
        MongoCollection<Document> col = db.getCollection("leave_types");
        if (col.countDocuments() > 0) {
            return;
        }
        Instant now = Instant.now();

        col.insertMany(List.of(
                leaveType(LEAVE_TYPE_ANNUAL_ID, "PAID_ANNUAL", "Congé Payé",
                        false, true, true, now),
                leaveType(LEAVE_TYPE_SICK_ID, "SICK", "Congé Maladie",
                        true, false, true, now),
                leaveType(LEAVE_TYPE_UNPAID_ID, "UNPAID", "Congé Sans Solde",
                        false, false, true, now),
                leaveType(LEAVE_TYPE_MATERNITY_ID, "MATERNITY", "Congé Maternité",
                        true, false, true, now)
        ));
    }

    // -------------------------------------------------------------------------
    // leave_policies  (matches LeavePolicy entity fields + a few product
    //                  extensions already used by the app)
    // -------------------------------------------------------------------------
    private void seedLeavePolicies(MongoDatabase db) {
        MongoCollection<Document> col = db.getCollection("leave_policies");
        if (col.countDocuments() > 0) {
            return;
        }
        Instant now = Instant.now();

        // ========================= TUNISIA =========================

        // TN PAID_ANNUAL — Labour Code Arts. 112-116: 1 WD / month worked
        col.insertOne(new Document("_id", POLICY_TN_ANNUAL_ID)
                .append("country", "TN")
                .append("leaveTypeCode", "PAID_ANNUAL")
                .append("accrualUnit", "WORKING_DAY")
                .append("accrualRate", 1.0)
                .append("maxBalance", 30.0)
                .append("minBlockDays", 6.0)
                .append("noticeDays", 3)
                .append("createdAt", now)
                .append("updatedAt", now));

        // TN SICK — no balance deduction, proof required (CNAM)
        col.insertOne(new Document("_id", POLICY_TN_SICK_ID)
                .append("country", "TN")
                .append("leaveTypeCode", "SICK")
                .append("accrualUnit", "CALENDAR_DAY")
                .append("accrualRate", 0.0)
                .append("maxBalance", null)
                .append("minBlockDays", null)
                .append("noticeDays", 0)
                .append("createdAt", now)
                .append("updatedAt", now));

        // TN UNPAID — discretionary, ~90 days reference
        col.insertOne(new Document("_id", POLICY_TN_UNPAID_ID)
                .append("country", "TN")
                .append("leaveTypeCode", "UNPAID")
                .append("accrualUnit", "WORKING_DAY")
                .append("accrualRate", 0.0)
                .append("maxBalance", null)
                .append("minBlockDays", null)
                .append("noticeDays", null)
                .append("createdAt", now)
                .append("updatedAt", now));

        // TN MATERNITY — Art. 64 (30 days + medical extensions)
        col.insertOne(new Document("_id", POLICY_TN_MATERNITY_ID)
                .append("country", "TN")
                .append("leaveTypeCode", "MATERNITY")
                .append("accrualUnit", "CALENDAR_DAY")
                .append("accrualRate", 0.0)
                .append("maxBalance", null)
                .append("minBlockDays", null)
                .append("noticeDays", 0)
                .append("createdAt", now)
                .append("updatedAt", now));

        // ========================= FRANCE =========================

        // FR PAID_ANNUAL — L3141-1 / L3141-3: 2.5 WD / month ≈ 30 / year
        col.insertOne(new Document("_id", POLICY_FR_ANNUAL_ID)
                .append("country", "FR")
                .append("leaveTypeCode", "PAID_ANNUAL")
                .append("accrualUnit", "WORKING_DAY")
                .append("accrualRate", 2.5)
                .append("maxBalance", 30.0)
                .append("minBlockDays", null)
                .append("noticeDays", null)
                .append("createdAt", now)
                .append("updatedAt", now));

        // FR SICK
        col.insertOne(new Document("_id", POLICY_FR_SICK_ID)
                .append("country", "FR")
                .append("leaveTypeCode", "SICK")
                .append("accrualUnit", "CALENDAR_DAY")
                .append("accrualRate", 0.0)
                .append("maxBalance", null)
                .append("minBlockDays", null)
                .append("noticeDays", 0)
                .append("createdAt", now)
                .append("updatedAt", now));

        // FR UNPAID
        col.insertOne(new Document("_id", POLICY_FR_UNPAID_ID)
                .append("country", "FR")
                .append("leaveTypeCode", "UNPAID")
                .append("accrualUnit", "WORKING_DAY")
                .append("accrualRate", 0.0)
                .append("maxBalance", null)
                .append("minBlockDays", null)
                .append("noticeDays", null)
                .append("createdAt", now)
                .append("updatedAt", now));

        // FR MATERNITY — L1225-17 et seq.
        col.insertOne(new Document("_id", POLICY_FR_MATERNITY_ID)
                .append("country", "FR")
                .append("leaveTypeCode", "MATERNITY")
                .append("accrualUnit", "CALENDAR_DAY")
                .append("accrualRate", 0.0)
                .append("maxBalance", null)
                .append("minBlockDays", null)
                .append("noticeDays", 0)
                .append("createdAt", now)
                .append("updatedAt", now));
    }

    // ---- helpers ----
    private static Document leaveType(String id, String code, String label,
                                      boolean requiresProof, boolean deducts,
                                      boolean isActive, Instant now) {
        return new Document("_id", id)
                .append("code", code)
                .append("label", label)
                .append("requiresProof", requiresProof)
                .append("deductsFromBalance", deducts)
                .append("isActive", isActive)
                .append("createdAt", now)
                .append("updatedAt", now);
    }
}
