package com.stagepfa.demo.domain.entities;

import com.stagepfa.demo.domain.entities.embedded.Assignment;
import com.stagepfa.demo.domain.entities.embedded.EmployeeProfile;
import com.stagepfa.demo.domain.enums.EmploymentStatus;
import com.stagepfa.demo.domain.entities.embedded.ManagerRef;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor

@Document(collection = "employees")
public class Employee {
    //@Id
    @MongoId
    private String id;

    private String employeeNumber;

    private EmployeeProfile profile;

    private EmploymentStatus employmentStatus;

    private Assignment currentAssignment;

    @Builder.Default
    private List<Assignment> assignmentHistory = new ArrayList<>();

    private ManagerRef currentManager;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}

