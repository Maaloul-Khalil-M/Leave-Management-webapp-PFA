package com.stagepfa.demo.domain.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveTypeResponse {
    private String id;
    private String code;
    private String label;
    private boolean requiresProof;
    private boolean deductsFromBalance;
    private boolean isActive;
}
