package com.stagepfa.demo.domain.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AssignmentRequest {

    @NotBlank
    private String departmentId;

    @NotBlank
    private String departmentLabel;

    @NotBlank
    private String positionId;

    @NotBlank
    private String positionLabel;

    @NotNull
    private LocalDate startDate;

    /**
     * Null for an open-ended (current) assignment.
     */
    private LocalDate endDate;
}
