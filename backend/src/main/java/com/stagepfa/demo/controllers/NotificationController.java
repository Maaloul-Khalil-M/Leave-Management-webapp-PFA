package com.stagepfa.demo.controllers;

import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.dtos.response.NotificationResponse;
import com.stagepfa.demo.services.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(operationId = "listMyNotifications", summary = "List notifications for the current user")
    public ResponseEntity<PageResponse<NotificationResponse>> listMine() {
        List<NotificationResponse> data = notificationService.listMyNotifications();
        return ResponseEntity.ok(PageResponse.<NotificationResponse>builder()
                .data(data)
                .pagination(PaginationMeta.builder()
                        .nextCursor(null)
                        .hasMore(false)
                        .limit(data.size())
                        .build())
                .build());
    }

    @PostMapping("/{id}/read")
    @Operation(operationId = "markNotificationRead", summary = "Mark a notification as read")
    @ApiResponse(responseCode = "200", description = "Notification marked as read")
    public ResponseEntity<NotificationResponse> markRead(@PathVariable String id) {
        NotificationResponse response = notificationService.markAsRead(id);
        return ResponseEntity.ok(response);
    }
}
