package com.stagepfa.demo.domain.dtos.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateLeaveTypeRequest {
    @Size(max = 150)
    private String label;


    private Boolean requiresProof;
    private Boolean deductsFromBalance;
    private Boolean isActive;
}
