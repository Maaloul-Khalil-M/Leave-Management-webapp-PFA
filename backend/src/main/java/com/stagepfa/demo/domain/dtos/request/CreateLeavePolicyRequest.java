package com.stagepfa.demo.domain.dtos.request;

import com.stagepfa.demo.domain.entities.embedded.LeaveBonus;
import com.stagepfa.demo.domain.enums.AccrualUnit;
import com.stagepfa.demo.domain.enums.CountryCode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Builder
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

    @Valid
    @Builder.Default
    private List<LeaveBonus> bonuses = new ArrayList<>();
}
