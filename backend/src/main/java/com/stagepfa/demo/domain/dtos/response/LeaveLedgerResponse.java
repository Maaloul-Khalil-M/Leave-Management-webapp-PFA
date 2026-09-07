package com.stagepfa.demo.domain.dtos.response;

import com.stagepfa.demo.domain.entities.embedded.LedgerMovement;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveLedgerResponse {
    private String id;
    private String employeeId;
    private String leaveTypeCode;
    private int year;
    private String policyId;
    private double accruedToDate;
    private double consumedBalance;
    private double carriedOverFromPreviousYear;
    private double availableBalance;
    private List<LedgerMovement> movements;
}
