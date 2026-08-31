package com.stagepfa.demo.domain.dtos.request;


import com.stagepfa.demo.domain.enums.EmploymentStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateEmployeeRequest {

    private EmploymentStatus employmentStatus;

    // --- profile fields ---

    @Size(max = 100)
    private String firstName;

    @Size(max = 100)
    private String lastName;

    private String gender;
    private LocalDate birthDate;

    @Email
    private String email;

    private String phone;
    private LocalDate hireDate;
    private LocalDate departureDate;

    // --- optional transfer: when present, service should close the current
    // assignment (set its endDate), push it to assignmentHistory, and set this
    // as the new currentAssignment ---

    @Valid
    private AssignmentRequest newAssignment;

    /**
     * Nullable: pass to reassign manager, omit to leave unchanged.
     */
    private String managerEmployeeId;
}

