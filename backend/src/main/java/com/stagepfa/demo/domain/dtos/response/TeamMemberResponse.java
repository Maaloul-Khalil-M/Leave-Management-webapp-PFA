package com.stagepfa.demo.domain.dtos.response;

import com.stagepfa.demo.domain.enums.EmploymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberResponse {
    private String employeeId;
    private String employeeNumber;
    private String firstName;
    private String lastName;
    private String email;
    private String departmentLabel;
    private String positionLabel;
    private EmploymentStatus employmentStatus;
}
