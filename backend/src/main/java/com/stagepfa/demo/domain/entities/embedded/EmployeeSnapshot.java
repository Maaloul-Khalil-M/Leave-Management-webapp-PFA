package com.stagepfa.demo.domain.entities.embedded;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeSnapshot {
    private String employeeId;
    private String employeeNumber;
    private String firstName;
    private String lastName;
    private String email;
    private String departmentLabel;
    private String positionLabel;
}
