package com.stagepfa.demo.domain.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateLeaveTypeRequest {
    @NotBlank
    @Size(max = 50)
    private String code;

    @NotBlank
    @Size(max = 150)
    private String label;

    private boolean requiresProof;
    private boolean deductsFromBalance;
    private boolean isActive;
}
