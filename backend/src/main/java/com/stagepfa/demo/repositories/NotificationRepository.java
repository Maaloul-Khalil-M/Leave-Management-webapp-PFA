package com.stagepfa.demo.repositories;

import com.stagepfa.demo.domain.entities.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {

    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(String recipientUserId);

    List<Notification> findByRecipientUserIdOrRecipientEmployeeIdOrderByCreatedAtDesc(
            String recipientUserId,
            String recipientEmployeeId
    );
}
