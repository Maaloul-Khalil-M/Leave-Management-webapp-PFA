package com.stagepfa.demo.domain.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Result of an eligibility check. reasons stays for backward compatibility
 * (technical strings). Prefer explanations for UI copy.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EligibilityResponse {

    private boolean eligible;

    private double durationDays;

    /** Null when the leave type does not deduct from balance. */
    private Double availableBalance;

    /**
     * First BLOCKING explanation code, if any (e.g. INSUFFICIENT_BALANCE).
     * Convenient for clients that only need one machine key.
     */
    private String blockingCode;

    /** Technical reason strings (legacy / logs). */
    @Builder.Default
    private List<String> reasons = new ArrayList<>();

    /** Plain-English messages for the UI (INFO / WARNING / BLOCKING). */
    @Builder.Default
    private List<Explanation> explanations = new ArrayList<>();
}
