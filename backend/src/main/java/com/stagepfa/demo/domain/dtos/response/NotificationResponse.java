package com.stagepfa.demo.domain.dtos.response;

import com.stagepfa.demo.domain.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private String id;
    private String recipientUserId;
    private String recipientEmployeeId;
    private String title;
    private String message;
    private NotificationType type;
    private boolean read;
    private String leaveRequestId;
    private Instant createdAt;
}
