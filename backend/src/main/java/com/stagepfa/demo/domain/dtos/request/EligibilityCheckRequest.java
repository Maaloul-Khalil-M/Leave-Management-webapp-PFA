package com.stagepfa.demo.domain.dtos.request;

import com.stagepfa.demo.domain.enums.L_CODE;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EligibilityCheckRequest {

    @NotNull(message = "Leave type code is required")
    private L_CODE leaveTypeCode;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    private boolean halfDayStart;
    private boolean halfDayEnd;

    private String excludeRequestId;
}
