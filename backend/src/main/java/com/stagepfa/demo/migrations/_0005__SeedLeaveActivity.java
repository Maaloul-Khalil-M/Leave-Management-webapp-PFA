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

import static com.stagepfa.demo.migrations._0002__SeedLeaveCatalog.*;
import static com.stagepfa.demo.migrations._0004__SeedDemoWorkforce.*;

/**
 * STEP 5 — Leave activity: leave_ledgers + leave_requests.
 *
 * Covers all LeaveRequestStatus values and realistic ledger movements.
 * Dual-country: Karim uses TN annual policy (1 WD/month), Camille uses FR (2.5).
 *
 * Ledger field names match LeaveLedger entity:
 *   accruedToDate, carriedOver, consumedBalance, availableBalance, movements[]
 * Movement field names match LedgerMovement:
 *   date, type, amount, note, leaveRequestId, actorUserId
 *
 * Idempotent: guarded on Ahmed's PAID_ANNUAL/2026 ledger.
 */
@TargetSystem(id = "leave-management-mongo")
@Change(id = "0005-seed-leave-activity", author = "ana")
public class _0005__SeedLeaveActivity {

    private static final int YEAR = 2026;

    // ---- Ledgers ----
    public static final String LEDGER_AHMED_ANNUAL_ID   = "665f000000000000000000a0";
    public static final String LEDGER_SALMA_ANNUAL_ID   = "665f000000000000000000a1";
    public static final String LEDGER_YOSRA_ANNUAL_ID   = "665f000000000000000000a2";
    public static final String LEDGER_KARIM_ANNUAL_ID   = "665f000000000000000000c4";
    public static final String LEDGER_CAMILLE_ANNUAL_ID = "665f000000000000000000c5";

    // ---- Leave requests (core team) ----
    public static final String REQ_AHMED_APPROVED_ID  = "665f000000000000000000b0";
    public static final String REQ_AHMED_PENDING_ID   = "665f000000000000000000b1";
    public static final String REQ_AHMED_DRAFT_ID     = "665f000000000000000000b2";
    public static final String REQ_YOSRA_REJECTED_ID  = "665f000000000000000000b3";
    public static final String REQ_YOSRA_CANCELLED_ID = "665f000000000000000000b4";

    // ---- Leave requests (dual-country) ----
    public static final String REQ_KARIM_APPROVED_ID  = "665f000000000000000000d0";
    public static final String REQ_KARIM_PENDING_ID   = "665f000000000000000000d1";
    public static final String REQ_CAMILLE_APPROVED_ID = "665f000000000000000000d2";
    public static final String REQ_CAMILLE_DRAFT_ID    = "665f000000000000000000d3";

    @Apply
    public void apply(MongoDatabase db) {
        MongoCollection<Document> ledgers = db.getCollection("leave_ledgers");
        if (ledgers.countDocuments(new Document("_id", LEDGER_AHMED_ANNUAL_ID)) > 0) {
            return;
        }
        seedLedgers(db);
        seedLeaveRequests(db);
    }

    @Rollback
    public void rollback(MongoDatabase db) {
        db.getCollection("leave_requests").deleteMany(new Document());
        db.getCollection("leave_ledgers").deleteMany(new Document());
    }

    // =========================================================================
    // leave_ledgers
    // =========================================================================
    private void seedLedgers(MongoDatabase db) {
        MongoCollection<Document> col = db.getCollection("leave_ledgers");
        Instant now = Instant.now();

        // ---- Ahmed: opening 15 + 1 accrual − 3 approved = 13 available ----
        col.insertOne(ledger(
                LEDGER_AHMED_ANNUAL_ID, EMP_AHMED_ID, "PAID_ANNUAL", YEAR,
                POLICY_TN_ANNUAL_ID,
                16.0,   // accruedToDate (opening credit counted here + monthly)
                0.0,    // carriedOver
                3.0,    // consumed
                13.0,   // available
                List.of(
                        movement("2026-01-01T00:00:00Z", "HR_ADJUSTMENT_CREDIT", 15.0,
                                "Opening balance 2026", null, USER_LEILA_ID),
                        movement("2026-01-31T00:00:00Z", "MONTHLY_ACCRUAL", 1.0,
                                "January accrual (TN 1 WD/month)", null, null),
                        movement("2026-06-10T10:00:00Z", "APPROVED_LEAVE_DEBIT", -3.0,
                                "Approved leave debit", REQ_AHMED_APPROVED_ID, USER_SALMA_ID)
                ), now));

        // ---- Salma: carry-over 5 + opening 20 = 25 available, no consumption ----
        col.insertOne(ledger(
                LEDGER_SALMA_ANNUAL_ID, EMP_SALMA_ID, "PAID_ANNUAL", YEAR,
                POLICY_TN_ANNUAL_ID,
                20.0, 5.0, 0.0, 25.0,
                List.of(
                        movement("2026-01-01T00:00:00Z", "CARRY_OVER", 5.0,
                                "Carry-over from 2025", null, null),
                        movement("2026-01-01T00:00:00Z", "HR_ADJUSTMENT_CREDIT", 20.0,
                                "Opening grant 2026", null, USER_LEILA_ID)
                ), now));

        // ---- Yosra: same shape as Ahmed but no debit yet (available higher) ----
        col.insertOne(ledger(
                LEDGER_YOSRA_ANNUAL_ID, EMP_YOSRA_ID, "PAID_ANNUAL", YEAR,
                POLICY_TN_ANNUAL_ID,
                16.0, 0.0, 0.0, 16.0,
                List.of(
                        movement("2026-01-01T00:00:00Z", "HR_ADJUSTMENT_CREDIT", 15.0,
                                "Opening balance 2026", null, USER_LEILA_ID),
                        movement("2026-01-31T00:00:00Z", "MONTHLY_ACCRUAL", 1.0,
                                "January accrual (TN 1 WD/month)", null, null)
                ), now));

        // ---- Karim (TN): 12 opening + 1 accrual − 6 approved = 7 available ----
        // Intentionally different numbers from Ahmed to exercise TN minBlock=6
        col.insertOne(ledger(
                LEDGER_KARIM_ANNUAL_ID, EMP_KARIM_ID, "PAID_ANNUAL", YEAR,
                POLICY_TN_ANNUAL_ID,
                13.0, 0.0, 6.0, 7.0,
                List.of(
                        movement("2026-01-01T00:00:00Z", "HR_ADJUSTMENT_CREDIT", 12.0,
                                "Opening balance 2026 (TN)", null, USER_LEILA_ID),
                        movement("2026-01-31T00:00:00Z", "MONTHLY_ACCRUAL", 1.0,
                                "January accrual (TN 1 WD/month)", null, null),
                        movement("2026-06-15T10:00:00Z", "APPROVED_LEAVE_DEBIT", -6.0,
                                "Approved leave debit", REQ_KARIM_APPROVED_ID, USER_SALMA_ID)
                ), now));

        // ---- Camille (FR): 20 opening + 2×2.5 accrual − 5 approved = 20 available ----
        col.insertOne(ledger(
                LEDGER_CAMILLE_ANNUAL_ID, EMP_CAMILLE_ID, "PAID_ANNUAL", YEAR,
                POLICY_FR_ANNUAL_ID,
                25.0, 0.0, 5.0, 20.0,
                List.of(
                        movement("2026-01-01T00:00:00Z", "HR_ADJUSTMENT_CREDIT", 20.0,
                                "Opening balance 2026 (FR)", null, USER_LEILA_ID),
                        movement("2026-01-31T00:00:00Z", "MONTHLY_ACCRUAL", 2.5,
                                "January accrual (FR 2.5 WD/month)", null, null),
                        movement("2026-02-28T00:00:00Z", "MONTHLY_ACCRUAL", 2.5,
                                "February accrual (FR 2.5 WD/month)", null, null),
                        movement("2026-05-20T14:00:00Z", "APPROVED_LEAVE_DEBIT", -5.0,
                                "Approved leave debit", REQ_CAMILLE_APPROVED_ID, USER_SALMA_ID)
                ), now));
    }

    // =========================================================================
    // leave_requests
    // =========================================================================
    private void seedLeaveRequests(MongoDatabase db) {
        MongoCollection<Document> col = db.getCollection("leave_requests");

        Document snapAhmed = snapshot(EMP_AHMED_ID, "EMP-001", "Ahmed", "Ben Salah",
                "ahmed@acme.tn", "Engineering", "Backend Developer");
        Document snapYosra = snapshot(EMP_YOSRA_ID, "EMP-002", "Yosra", "Khelifi",
                "yosra@acme.tn", "Engineering", "Frontend Developer");
        Document snapKarim = snapshot(EMP_KARIM_ID, "EMP-TN-001", "Karim", "Ben Ammar",
                "karim@acme.tn", "Engineering", "Backend Developer");
        Document snapCamille = snapshot(EMP_CAMILLE_ID, "EMP-FR-001", "Camille", "Dupont",
                "camille@acme.fr", "Engineering", "Frontend Developer");

        // ========== Core team ==========

        // APPROVED — Ahmed, 3 WD (Mon–Wed 8-10 Jun)
        col.insertOne(request(
                REQ_AHMED_APPROVED_ID, EMP_AHMED_ID, snapAhmed, "PAID_ANNUAL",
                LocalDate.of(2026, 6, 8), LocalDate.of(2026, 6, 10),
                false, false, 3.0, "Family event", "APPROVED",
                List.of(
                        history(null, "DRAFT", "2026-06-01T08:00:00Z", USER_AHMED_ID, "Created"),
                        history("DRAFT", "PENDING", "2026-06-01T09:00:00Z", USER_AHMED_ID, "Submitted"),
                        history("PENDING", "APPROVED", "2026-06-02T10:00:00Z", USER_SALMA_ID, "OK for family event")
                ),
                Instant.parse("2026-06-01T09:00:00Z"),
                Instant.parse("2026-06-02T10:00:00Z"), USER_SALMA_ID, "OK for family event",
                Instant.parse("2026-06-01T08:00:00Z"), Instant.parse("2026-06-02T10:00:00Z")));

        // PENDING — Ahmed, 2 WD (14-15 Sep)
        col.insertOne(request(
                REQ_AHMED_PENDING_ID, EMP_AHMED_ID, snapAhmed, "PAID_ANNUAL",
                LocalDate.of(2026, 9, 14), LocalDate.of(2026, 9, 15),
                false, false, 2.0, "Personal appointment", "PENDING",
                List.of(
                        history(null, "DRAFT", "2026-09-01T08:00:00Z", USER_AHMED_ID, "Created"),
                        history("DRAFT", "PENDING", "2026-09-01T08:30:00Z", USER_AHMED_ID, "Submitted")
                ),
                Instant.parse("2026-09-01T08:30:00Z"),
                null, null, null,
                Instant.parse("2026-09-01T08:00:00Z"), Instant.parse("2026-09-01T08:30:00Z")));

        // DRAFT — Ahmed, year-end
        col.insertOne(request(
                REQ_AHMED_DRAFT_ID, EMP_AHMED_ID, snapAhmed, "PAID_ANNUAL",
                LocalDate.of(2026, 12, 21), LocalDate.of(2026, 12, 23),
                false, false, 3.0, "Year-end break (draft)", "DRAFT",
                List.of(
                        history(null, "DRAFT", "2026-09-02T12:00:00Z", USER_AHMED_ID, "Created")
                ),
                null, null, null, null,
                Instant.parse("2026-09-02T12:00:00Z"), Instant.parse("2026-09-02T12:00:00Z")));

        // REJECTED — Yosra, 5 WD travel
        col.insertOne(request(
                REQ_YOSRA_REJECTED_ID, EMP_YOSRA_ID, snapYosra, "PAID_ANNUAL",
                LocalDate.of(2026, 7, 6), LocalDate.of(2026, 7, 10),
                false, false, 5.0, "Travel", "REJECTED",
                List.of(
                        history(null, "DRAFT", "2026-06-20T08:00:00Z", USER_YOSRA_ID, "Created"),
                        history("DRAFT", "PENDING", "2026-06-20T09:00:00Z", USER_YOSRA_ID, "Submitted"),
                        history("PENDING", "REJECTED", "2026-06-21T11:00:00Z", USER_SALMA_ID, "Critical delivery week")
                ),
                Instant.parse("2026-06-20T09:00:00Z"),
                Instant.parse("2026-06-21T11:00:00Z"), USER_SALMA_ID, "Critical delivery week",
                Instant.parse("2026-06-20T08:00:00Z"), Instant.parse("2026-06-21T11:00:00Z")));

        // CANCELLED — Yosra SICK (no balance impact)
        col.insertOne(request(
                REQ_YOSRA_CANCELLED_ID, EMP_YOSRA_ID, snapYosra, "SICK",
                LocalDate.of(2026, 3, 10), LocalDate.of(2026, 3, 11),
                false, false, 2.0, "Flu", "CANCELLED",
                List.of(
                        history(null, "DRAFT", "2026-03-09T07:00:00Z", USER_YOSRA_ID, "Created"),
                        history("DRAFT", "PENDING", "2026-03-09T07:05:00Z", USER_YOSRA_ID, "Submitted"),
                        history("PENDING", "APPROVED", "2026-03-09T08:00:00Z", USER_SALMA_ID, "Get well"),
                        history("APPROVED", "CANCELLED", "2026-03-09T18:00:00Z", USER_YOSRA_ID, "Feeling better")
                ),
                Instant.parse("2026-03-09T07:05:00Z"),
                Instant.parse("2026-03-09T08:00:00Z"), USER_SALMA_ID, "Get well",
                Instant.parse("2026-03-09T07:00:00Z"), Instant.parse("2026-03-09T18:00:00Z")));

        // ========== Dual-country ==========

        // Karim APPROVED — 6 WD (satisfies TN minBlockDays=6)
        col.insertOne(request(
                REQ_KARIM_APPROVED_ID, EMP_KARIM_ID, snapKarim, "PAID_ANNUAL",
                LocalDate.of(2026, 6, 8), LocalDate.of(2026, 6, 13),
                false, false, 6.0, "Family visit (TN)", "APPROVED",
                List.of(
                        history(null, "DRAFT", "2026-05-20T09:00:00Z", USER_KARIM_ID, "Created"),
                        history("DRAFT", "PENDING", "2026-05-20T10:00:00Z", USER_KARIM_ID, "Submitted"),
                        history("PENDING", "APPROVED", "2026-05-21T11:00:00Z", USER_SALMA_ID, "Approved")
                ),
                Instant.parse("2026-05-20T10:00:00Z"),
                Instant.parse("2026-05-21T11:00:00Z"), USER_SALMA_ID, "Approved",
                Instant.parse("2026-05-20T09:00:00Z"), Instant.parse("2026-05-21T11:00:00Z")));

        // Karim PENDING — 5 WD August (below minBlock — useful for eligibility demos)
        col.insertOne(request(
                REQ_KARIM_PENDING_ID, EMP_KARIM_ID, snapKarim, "PAID_ANNUAL",
                LocalDate.of(2026, 8, 17), LocalDate.of(2026, 8, 21),
                false, false, 5.0, "Summer break (TN)", "PENDING",
                List.of(
                        history(null, "DRAFT", "2026-07-01T08:00:00Z", USER_KARIM_ID, "Created"),
                        history("DRAFT", "PENDING", "2026-07-01T09:00:00Z", USER_KARIM_ID, "Submitted")
                ),
                Instant.parse("2026-07-01T09:00:00Z"),
                null, null, null,
                Instant.parse("2026-07-01T08:00:00Z"), Instant.parse("2026-07-01T09:00:00Z")));

        // Camille APPROVED — 5 WD (FR, no min-block constraint)
        col.insertOne(request(
                REQ_CAMILLE_APPROVED_ID, EMP_CAMILLE_ID, snapCamille, "PAID_ANNUAL",
                LocalDate.of(2026, 5, 11), LocalDate.of(2026, 5, 15),
                false, false, 5.0, "Pont de l'Ascension (FR)", "APPROVED",
                List.of(
                        history(null, "DRAFT", "2026-04-10T09:00:00Z", USER_CAMILLE_ID, "Created"),
                        history("DRAFT", "PENDING", "2026-04-10T10:00:00Z", USER_CAMILLE_ID, "Submitted"),
                        history("PENDING", "APPROVED", "2026-04-11T14:00:00Z", USER_SALMA_ID, "OK")
                ),
                Instant.parse("2026-04-10T10:00:00Z"),
                Instant.parse("2026-04-11T14:00:00Z"), USER_SALMA_ID, "OK",
                Instant.parse("2026-04-10T09:00:00Z"), Instant.parse("2026-04-11T14:00:00Z")));

        // Camille DRAFT — future summer leave
        col.insertOne(request(
                REQ_CAMILLE_DRAFT_ID, EMP_CAMILLE_ID, snapCamille, "PAID_ANNUAL",
                LocalDate.of(2026, 8, 3), LocalDate.of(2026, 8, 14),
                false, false, 10.0, "Congés d'été (FR draft)", "DRAFT",
                List.of(
                        history(null, "DRAFT", "2026-06-15T12:00:00Z", USER_CAMILLE_ID, "Created")
                ),
                null, null, null, null,
                Instant.parse("2026-06-15T12:00:00Z"), Instant.parse("2026-06-15T12:00:00Z")));
    }

    // =========================================================================
    // Builders (match domain entities exactly)
    // =========================================================================
    private static Document ledger(String id, String employeeId, String leaveTypeCode,
                                   int year, String policyId,
                                   double accrued, double carried, double consumed,
                                   double available, List<Document> movements, Instant now) {
        return new Document("_id", id)
                .append("employeeId", employeeId)
                .append("leaveTypeCode", leaveTypeCode)
                .append("year", year)
                .append("policyId", policyId)
                .append("accruedToDate", accrued)
                .append("carriedOver", carried)
                .append("consumedBalance", consumed)
                .append("availableBalance", available)
                .append("movements", movements)
                .append("createdAt", now)
                .append("updatedAt", now);
    }

    private static Document movement(String iso, String type, double amount, String note,
                                     String leaveRequestId, String actorUserId) {
        return new Document()
                .append("date", Instant.parse(iso))
                .append("type", type)
                .append("amount", amount)
                .append("note", note)
                .append("leaveRequestId", leaveRequestId)
                .append("actorUserId", actorUserId);
    }

    private static Document request(String id, String employeeId, Document snapshot,
                                    String leaveTypeCode,
                                    LocalDate start, LocalDate end,
                                    boolean halfStart, boolean halfEnd, double duration,
                                    String reason, String status,
                                    List<Document> history,
                                    Instant submittedAt,
                                    Instant validatedAt, String validatedBy, String validationComment,
                                    Instant createdAt, Instant updatedAt) {
        return new Document("_id", id)
                .append("employeeId", employeeId)
                .append("leaveTypeCode", leaveTypeCode)
                .append("employeeSnapshot", snapshot)
                .append("startDate", start)
                .append("endDate", end)
                .append("halfDayStart", halfStart)
                .append("halfDayEnd", halfEnd)
                .append("durationDays", duration)
                .append("status", status)
                .append("submittedAt", submittedAt)
                .append("statusHistory", history)
                .append("reason", reason)
                .append("supportingDocuments", List.of())
                .append("validatedAt", validatedAt)
                .append("validatedBy", validatedBy)
                .append("validationComment", validationComment);
        // Note: LeaveRequest entity has no createdAt/updatedAt — omitted intentionally
    }

    private static Document snapshot(String employeeId, String employeeNumber,
                                     String firstName, String lastName, String email,
                                     String departmentLabel, String positionLabel) {
        return new Document()
                .append("employeeId", employeeId)
                .append("employeeNumber", employeeNumber)
                .append("firstName", firstName)
                .append("lastName", lastName)
                .append("email", email)
                .append("departmentLabel", departmentLabel)
                .append("positionLabel", positionLabel);
    }

    private static Document history(String from, String to, String atIso,
                                    String byUserId, String comment) {
        return new Document()
                .append("fromStatus", from)
                .append("toStatus", to)
                .append("at", Instant.parse(atIso))
                .append("byUserId", byUserId)
                .append("comment", comment);
    }
}
