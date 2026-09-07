package com.stagepfa.demo.domain.dtos.request;

import com.stagepfa.demo.domain.enums.AccrualUnit;
import com.stagepfa.demo.domain.enums.CountryCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateLeavePolicyRequest {

    @NotNull
    private CountryCode country;

    @NotBlank
    private String leaveTypeCode;

    @NotNull
    private AccrualUnit accrualUnit;

    private double accrualRate;

    private Double maxBalance;

    private Double minBlockDays;

    private Integer noticeDays;
}
