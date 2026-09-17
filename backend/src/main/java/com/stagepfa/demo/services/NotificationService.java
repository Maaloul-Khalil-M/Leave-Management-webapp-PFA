package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.response.NotificationResponse;
import com.stagepfa.demo.domain.events.LeaveRequestEvent;

import java.util.List;

public interface NotificationService {

    List<NotificationResponse> listMyNotifications();

    NotificationResponse markAsRead(String notificationId);

    void handleLeaveRequestEvent(LeaveRequestEvent event);
}
