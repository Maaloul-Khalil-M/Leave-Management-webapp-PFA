package com.stagepfa.demo.domain.dtos.response;


import com.stagepfa.demo.domain.entities.embedded.EmployeeSnapshot;
import com.stagepfa.demo.domain.entities.embedded.StatusHistoryEntry;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveRequestResponse {

    private String id;
    private String employeeId;
    private EmployeeSnapshot employeeSnapshot;

    private L_CODE leaveTypeCode;

    private LocalDate startDate;
    private LocalDate endDate;
    private boolean halfDayStart;
    private boolean halfDayEnd;
    private double durationDays;

    private LeaveRequestStatus status;
    private Instant submittedAt;

    @Builder.Default
    private List<StatusHistoryEntry> statusHistory = new ArrayList<>();

    private String reason;

    @Builder.Default
    private List<String> supportingDocuments = new ArrayList<>();

    private Instant validatedAt;
    private String validatedBy;
    private String validationComment;
}
