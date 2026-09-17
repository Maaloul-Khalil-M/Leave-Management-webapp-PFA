package com.stagepfa.demo.domain.entities;

import com.stagepfa.demo.domain.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notifications")
public class Notification {

    @MongoId
    private String id;

    @Indexed
    private String recipientUserId;

    @Indexed
    private String recipientEmployeeId;

    private String title;
    private String message;
    private NotificationType type;

    @Builder.Default
    private boolean read = false;

    private String leaveRequestId;

    @CreatedDate
    private Instant createdAt;
}
