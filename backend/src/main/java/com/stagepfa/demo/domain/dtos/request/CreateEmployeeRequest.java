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

    @NotNull
    private EmploymentStatus employmentStatus = EmploymentStatus.ACTIVE;

    // --- profile ---

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

    // --- initial assignment ---

    @NotNull
    @Valid
    private AssignmentRequest initialAssignment;

    // --- reporting line ---

    /**
     * Nullable for employees without a manager.
     */
    private String managerEmployeeId;
}
