package com.stagepfa.demo.domain.dtos.request;

import com.stagepfa.demo.domain.enums.EmploymentStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateEmployeeRequest {

    @NotBlank
    @Size(max = 50)
    private String employeeNumber;

    private EmploymentStatus employmentStatus = EmploymentStatus.ACTIVE;

    // --- profile fields ---

    @NotBlank
    @Size(max = 100)
    private String firstName;

    @NotBlank
    @Size(max = 100)
    private String lastName;

    private String gender;
    private LocalDate birthDate;

    @NotBlank
    @Email
    private String email;

    private String phone;
    private LocalDate hireDate;

    // --- assignment (was flat departmentId/positionId, now matches Assignment) ---

    @NotNull
    @Valid
    private AssignmentRequest initialAssignment;

    // --- reporting line ---

    /**
     * Nullable: top-level employees (e.g. a director) may have no manager.
     */
    private String managerEmployeeId;
}

