package com.stagepfa.demo.domain.dtos.response;

import com.stagepfa.demo.domain.entities.embedded.Assignment;
import com.stagepfa.demo.domain.entities.embedded.EmployeeProfile;
import com.stagepfa.demo.domain.enums.EmploymentStatus;
import com.stagepfa.demo.domain.entities.embedded.ManagerRef;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeResponse {
    private String id;
    private String employeeNumber;
    private EmploymentStatus employmentStatus;
    private EmployeeProfile profile;
    private Assignment currentAssignment;
    private List<Assignment> assignmentHistory;
    private ManagerRef currentManager;
    private Instant createdAt;
    private Instant updatedAt;
}
