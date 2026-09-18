package com.stagepfa.demo.domain.dtos.response;

import com.stagepfa.demo.domain.enums.ExplanationSeverity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Human-readable side of a rule result. Not persisted — built at check time
 * from the same policy/ledger/request inputs as eligibility.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Explanation {

    /** Stable machine key, e.g. INSUFFICIENT_BALANCE, MIN_BLOCK_DAYS. */
    private String code;

    private ExplanationSeverity severity;

    /** Short headline for banners/cards. */
    private String title;

    /** Plain English; no law article numbers. */
    private String body;

    /** Structured values for the UI (requested, available, minBlockDays, …). */
    @Builder.Default
    private Map<String, Object> params = new LinkedHashMap<>();
}
