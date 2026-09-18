package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.response.Explanation;
import com.stagepfa.demo.domain.enums.ExplanationSeverity;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Turns eligibility/policy triggers into plain-English Explanation objects.
 * Templates match the scenario library; no legal article text.
 */
@Component
public class ExplanationFactory {

    public Explanation employeeNotActive(String status) {
        return explanation(
                "EMPLOYEE_NOT_ACTIVE",
                ExplanationSeverity.BLOCKING,
                "Not eligible for leave",
                "Your employment status is " + status + ", so you can't request leave right now.",
                Map.of("status", status));
    }

    public Explanation leaveTypeInactive(String leaveTypeCode) {
        return explanation(
                "LEAVE_TYPE_INACTIVE",
                ExplanationSeverity.BLOCKING,
                "Leave type unavailable",
                "This leave type is not available for new requests.",
                Map.of("leaveTypeCode", leaveTypeCode));
    }

    public Explanation invalidDateRange() {
        return explanation(
                "INVALID_DATE_RANGE",
                ExplanationSeverity.BLOCKING,
                "Invalid dates",
                "The end date must be on or after the start date.",
                Map.of());
    }

    public Explanation minBlockDays(double minBlockDays, double requestedDays) {
        return explanation(
                "MIN_BLOCK_DAYS",
                ExplanationSeverity.BLOCKING,
                "Minimum block length",
                String.format(
                        "This leave type needs at least %.1f continuous days. You've asked for %.1f — extend the dates or pick another leave type for a short break.",
                        minBlockDays, requestedDays),
                params("minBlockDays", minBlockDays, "requested", requestedDays));
    }

    public Explanation overlapApproved(List<String> requestIds) {
        return explanation(
                "OVERLAP_DETECTED",
                ExplanationSeverity.BLOCKING,
                "Overlaps approved leave",
                "These dates overlap leave that is already approved. Pick different dates or cancel the other request first.",
                Map.of("overlappingRequestIds", requestIds));
    }

    public Explanation insufficientBalance(double available, double requested) {
        return explanation(
                "INSUFFICIENT_BALANCE",
                ExplanationSeverity.BLOCKING,
                "Not enough paid leave",
                String.format(
                        "You're asking for %.1f days but only have %.1f available right now.",
                        requested, available),
                params("requested", requested, "available", available));
    }

    public Explanation shortNotice(int noticeDays, long daysUntilStart) {
        return explanation(
                "SHORT_NOTICE",
                ExplanationSeverity.WARNING,
                "Short notice",
                String.format(
                        "This is usually requested at least %d days ahead. Your manager can still decide on it.",
                        noticeDays),
                params("noticeDays", noticeDays, "daysUntilStart", daysUntilStart));
    }

    public Explanation balanceOk(double available, double requested) {
        double remaining = available - requested;
        return explanation(
                "BALANCE_OK",
                ExplanationSeverity.INFO,
                "Balance impact",
                String.format(
                        "You have %.1f days available; this request would leave you with %.1f.",
                        available, remaining),
                params("available", available, "requested", requested, "remainingAfter", remaining));
    }

    public Explanation balanceUnaffected(String leaveTypeCode) {
        return explanation(
                "BALANCE_UNAFFECTED",
                ExplanationSeverity.INFO,
                "Balance not affected",
                "This leave type doesn't come out of your paid annual leave balance.",
                Map.of("leaveTypeCode", leaveTypeCode));
    }

    public Explanation durationInfo(double durationDays, String accrualUnit) {
        return explanation(
                "DURATION_COMPUTED",
                ExplanationSeverity.INFO,
                "Duration",
                String.format(
                        "This request counts as %.1f day(s) (%s).",
                        durationDays, humanUnit(accrualUnit)),
                params("durationDays", durationDays, "accrualUnit", accrualUnit));
    }

    public Explanation proofRequired(String leaveTypeCode) {
        return explanation(
                "PROOF_REQUIRED",
                ExplanationSeverity.WARNING,
                "Documentation needed",
                "Please attach a medical certificate or required proof before submitting.",
                Map.of("leaveTypeCode", leaveTypeCode));
    }

    private static String humanUnit(String accrualUnit) {
        if (accrualUnit == null) {
            return "working days";
        }
        return switch (accrualUnit) {
            case "CALENDAR_DAY" -> "calendar days";
            case "WORKING_DAY" -> "working days";
            default -> accrualUnit.toLowerCase().replace('_', ' ');
        };
    }

    private static Explanation explanation(
            String code,
            ExplanationSeverity severity,
            String title,
            String body,
            Map<String, Object> params) {
        return Explanation.builder()
                .code(code)
                .severity(severity)
                .title(title)
                .body(body)
                .params(params != null ? new LinkedHashMap<>(params) : new LinkedHashMap<>())
                .build();
    }

    private static Map<String, Object> params(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            map.put(String.valueOf(keyValues[i]), keyValues[i + 1]);
        }
        return map;
    }
}
