package com.stagepfa.demo.listeners;

import com.stagepfa.demo.domain.events.LeaveRequestEvent;
import com.stagepfa.demo.services.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class LeaveRequestNotificationListener {

    private final NotificationService notificationService;

    @EventListener
    public void onLeaveRequestEvent(LeaveRequestEvent event) {
        try {
            notificationService.handleLeaveRequestEvent(event);
        } catch (Exception e) {
            log.error("Failed to process notification for leave request event: {}", e.getMessage(), e);
        }
    }
}
