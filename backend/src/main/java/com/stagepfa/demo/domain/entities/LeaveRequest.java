package com.stagepfa.demo.domain.entities;

import com.stagepfa.demo.domain.entities.embedded.EmployeeSnapshot;
import com.stagepfa.demo.domain.entities.embedded.StatusHistoryEntry;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "leave_requests")
public class LeaveRequest {
    @Id
    private String id;

    //ref
    private String employeeId;
    private L_CODE leaveTypeCode;

    //snapshot of employee at the time of request
    private EmployeeSnapshot employeeSnapshot;

    //dates and duration
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean halfDayStart;
    private boolean halfDayEnd;
    //respect accuralUnit
    private double durationDays;

    //current and history of states
    private LeaveRequestStatus status;
    private Instant submittedAt;

    @Builder.Default
    private List<StatusHistoryEntry> statusHistory = new ArrayList<>();

    //Doc and reason
    private String reason;
    //TODO replace with google drive implementation
    /*
    DocumentEntity
    1. User clicks "Choose from Google Drive"
                  ↓
    2. Google Picker opens
                  ↓
    3. User selects report.pdf
                  ↓
    4. Picker gives your frontend the Google Drive fileId
                  ↓
    5. Frontend sends fileId to Spring Boot
                  ↓
    6. Spring Boot calls Google Drive API
                  ↓
    7. Google returns the file bytes
                  ↓
    8. Spring Boot stores the file
                  ↓
    9. MongoDB stores metadata
     */
    @Builder.Default
    private List<String> supportingDocuments = new ArrayList<>();

    //validation / response info
    private Instant validatedAt;
    private String validatedBy;
    private String validationComment;

}
