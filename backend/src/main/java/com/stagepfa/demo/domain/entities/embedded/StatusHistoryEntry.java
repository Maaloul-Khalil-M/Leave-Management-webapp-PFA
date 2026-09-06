package com.stagepfa.demo.domain.entities.embedded;

import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatusHistoryEntry {
    private LeaveRequestStatus fromStatus;
    private LeaveRequestStatus toStatus;
    private Instant at;
    private String byUserId;
    private String comment;
}
