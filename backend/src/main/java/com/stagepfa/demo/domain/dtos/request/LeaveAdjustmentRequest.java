package com.stagepfa.demo.domain.dtos.request;

import com.stagepfa.demo.domain.enums.LedgerMovementType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LeaveAdjustmentRequest {
    @NotBlank
    private String employeeId;

    @NotBlank
    private String leaveTypeCode;

    @NotNull
    private Integer year;

    @NotNull
    private Double amount;

    @NotNull
    private LedgerMovementType type;

    @Size(max = 1000)
    private String note;
}
