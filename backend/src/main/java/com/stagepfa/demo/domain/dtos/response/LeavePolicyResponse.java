package com.stagepfa.demo.domain.dtos.response;

import com.stagepfa.demo.domain.enums.AccrualUnit;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.domain.enums.L_CODE;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeavePolicyResponse {

    private String id;

    private CountryCode country;

    private L_CODE leaveTypeCode;

    private AccrualUnit accrualUnit;

    private double accrualRate;

    private Double maxBalance;

    private Double minBlockDays;

    private Integer noticeDays;

    private Instant createdAt;

    private Instant updatedAt;
}

