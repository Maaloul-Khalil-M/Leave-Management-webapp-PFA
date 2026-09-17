package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.dtos.response.NotificationResponse;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.Notification;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.domain.enums.NotificationType;
import com.stagepfa.demo.domain.events.LeaveRequestEvent;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.NotificationRepository;
import com.stagepfa.demo.repositories.UserRepository;
import com.stagepfa.demo.services.CurrentUserService;
import com.stagepfa.demo.services.EmailService;
import com.stagepfa.demo.services.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final EmailService emailService;

    @Override
    public List<NotificationResponse> listMyNotifications() {
        User user = currentUserService.requireLinkedUser();
        List<Notification> list = notificationRepository
                .findByRecipientUserIdOrRecipientEmployeeIdOrderByCreatedAtDesc(user.getId(), user.getEmployeeId());

        return list.stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(String notificationId) {
        User user = currentUserService.requireLinkedUser();
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", notificationId));

        boolean isUserRecipient = user.getId() != null && user.getId().equals(notification.getRecipientUserId());
        boolean isEmployeeRecipient = user.getEmployeeId() != null && user.getEmployeeId().equals(notification.getRecipientEmployeeId());

        if (!isUserRecipient && !isEmployeeRecipient) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "You are not authorized to access this notification");
        }

        notification.setRead(true);
        Notification saved = notificationRepository.save(notification);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void handleLeaveRequestEvent(LeaveRequestEvent event) {
        if (event == null || event.leaveRequest() == null) {
            return;
        }

        LeaveRequest request = event.leaveRequest();

        switch (event.toStatus()) {
            case PENDING -> handleSubmitted(request, event);
            case APPROVED -> handleApproved(request, event);
            case REJECTED -> handleRejected(request, event);
            case CANCELLED -> handleCancelled(request, event);
            default -> log.debug("No notification handled for transition to {}", event.toStatus());
        }
    }

    private void handleSubmitted(LeaveRequest request, LeaveRequestEvent event) {
        Employee requester = employeeRepository.findById(request.getEmployeeId()).orElse(null);
        if (requester == null || requester.getCurrentManager() == null) {
            log.info("Requester or currentManager not found for employee {}. Skipping manager notification.", request.getEmployeeId());
            return;
        }

        String managerEmpId = requester.getCurrentManager().getEmployeeId();
        if (managerEmpId == null || managerEmpId.isBlank()) {
            log.info("currentManager employeeId is empty for employee {}. Skipping manager notification.", request.getEmployeeId());
            return;
        }

        Employee manager = employeeRepository.findById(managerEmpId).orElse(null);
        User managerUser = userRepository.findByEmployeeId(managerEmpId).orElse(null);

        String managerName = (requester.getCurrentManager().getName() != null && !requester.getCurrentManager().getName().isBlank())
                ? requester.getCurrentManager().getName()
                : (manager != null && manager.getProfile() != null
                ? (manager.getProfile().getFirstName() + " " + manager.getProfile().getLastName()).trim()
                : "Manager");

        String managerEmail = (manager != null && manager.getProfile() != null && manager.getProfile().getEmail() != null)
                ? manager.getProfile().getEmail()
                : (managerUser != null ? managerUser.getEmail() : null);

        String requesterName = formatEmployeeName(requester, request);

        // 1. In-App Notification
        Notification notification = Notification.builder()
                .recipientUserId(managerUser != null ? managerUser.getId() : null)
                .recipientEmployeeId(managerEmpId)
                .title("Leave Request Submitted")
                .message(requesterName + " has submitted a " + formatLeaveType(request) + " request for "
                        + request.getStartDate() + " to " + request.getEndDate() + " (" + request.getDurationDays() + " days).")
                .type(NotificationType.LEAVE_SUBMITTED)
                .read(false)
                .leaveRequestId(request.getId())
                .createdAt(Instant.now())
                .build();
        notificationRepository.save(notification);

        // 2. Email Notification
        if (managerEmail != null && !managerEmail.isBlank()) {
            emailService.sendLeaveNotification(
                    managerEmail,
                    managerName,
                    "[Leave Request Submitted] " + requesterName + " - " + formatLeaveType(request),
                    "A new leave request has been submitted by your team member and awaits your approval.",
                    requesterName,
                    formatLeaveType(request),
                    request.getStartDate().toString(),
                    request.getEndDate().toString(),
                    request.getDurationDays(),
                    "PENDING",
                    request.getReason()
            );
        } else {
            log.info("Manager {} has no email configured. Skipped email delivery.", managerEmpId);
        }
    }

    private void handleApproved(LeaveRequest request, LeaveRequestEvent event) {
        Employee requester = employeeRepository.findById(request.getEmployeeId()).orElse(null);
        User requesterUser = userRepository.findByEmployeeId(request.getEmployeeId()).orElse(null);

        String requesterName = formatEmployeeName(requester, request);
        String requesterEmail = (requester != null && requester.getProfile() != null && requester.getProfile().getEmail() != null)
                ? requester.getProfile().getEmail()
                : (requesterUser != null ? requesterUser.getEmail() : null);

        String note = event.comment();

        // 1. In-App Notification
        Notification notification = Notification.builder()
                .recipientUserId(requesterUser != null ? requesterUser.getId() : null)
                .recipientEmployeeId(request.getEmployeeId())
                .title("Leave Request Approved")
                .message("Your " + formatLeaveType(request) + " request for " + request.getStartDate() + " to "
                        + request.getEndDate() + " (" + request.getDurationDays() + " days) has been approved."
                        + (note != null && !note.isBlank() ? " Note: \"" + note + "\"" : ""))
                .type(NotificationType.LEAVE_APPROVED)
                .read(false)
                .leaveRequestId(request.getId())
                .createdAt(Instant.now())
                .build();
        notificationRepository.save(notification);

        // 2. Email Notification
        if (requesterEmail != null && !requesterEmail.isBlank()) {
            emailService.sendLeaveNotification(
                    requesterEmail,
                    requesterName,
                    "[Leave Request Approved] Your " + formatLeaveType(request) + " request was approved",
                    "Your leave request has been approved by your manager.",
                    requesterName,
                    formatLeaveType(request),
                    request.getStartDate().toString(),
                    request.getEndDate().toString(),
                    request.getDurationDays(),
                    "APPROVED",
                    note
            );
        } else {
            log.info("Requester {} has no email configured. Skipped email delivery.", request.getEmployeeId());
        }
    }

    private void handleRejected(LeaveRequest request, LeaveRequestEvent event) {
        Employee requester = employeeRepository.findById(request.getEmployeeId()).orElse(null);
        User requesterUser = userRepository.findByEmployeeId(request.getEmployeeId()).orElse(null);

        String requesterName = formatEmployeeName(requester, request);
        String requesterEmail = (requester != null && requester.getProfile() != null && requester.getProfile().getEmail() != null)
                ? requester.getProfile().getEmail()
                : (requesterUser != null ? requesterUser.getEmail() : null);

        String reason = event.comment() != null ? event.comment() : "No reason provided";

        // 1. In-App Notification
        Notification notification = Notification.builder()
                .recipientUserId(requesterUser != null ? requesterUser.getId() : null)
                .recipientEmployeeId(request.getEmployeeId())
                .title("Leave Request Rejected")
                .message("Your " + formatLeaveType(request) + " request for " + request.getStartDate() + " to "
                        + request.getEndDate() + " was rejected. Reason: \"" + reason + "\"")
                .type(NotificationType.LEAVE_REJECTED)
                .read(false)
                .leaveRequestId(request.getId())
                .createdAt(Instant.now())
                .build();
        notificationRepository.save(notification);

        // 2. Email Notification
        if (requesterEmail != null && !requesterEmail.isBlank()) {
            emailService.sendLeaveNotification(
                    requesterEmail,
                    requesterName,
                    "[Leave Request Rejected] Your " + formatLeaveType(request) + " request was rejected",
                    "Your leave request has been reviewed and rejected.",
                    requesterName,
                    formatLeaveType(request),
                    request.getStartDate().toString(),
                    request.getEndDate().toString(),
                    request.getDurationDays(),
                    "REJECTED",
                    reason
            );
        } else {
            log.info("Requester {} has no email configured. Skipped email delivery.", request.getEmployeeId());
        }
    }

    private void handleCancelled(LeaveRequest request, LeaveRequestEvent event) {
        if (event.fromStatus() != LeaveRequestStatus.PENDING && event.fromStatus() != LeaveRequestStatus.APPROVED) {
            log.debug("Skipping manager notification for cancelled request from status {}", event.fromStatus());
            return;
        }

        Employee requester = employeeRepository.findById(request.getEmployeeId()).orElse(null);
        if (requester == null || requester.getCurrentManager() == null) {
            log.info("Requester or currentManager not found for employee {}. Skipping manager notification.", request.getEmployeeId());
            return;
        }

        String managerEmpId = requester.getCurrentManager().getEmployeeId();
        if (managerEmpId == null || managerEmpId.isBlank()) {
            log.info("currentManager employeeId is empty for employee {}. Skipping manager notification.", request.getEmployeeId());
            return;
        }

        Employee manager = employeeRepository.findById(managerEmpId).orElse(null);
        User managerUser = userRepository.findByEmployeeId(managerEmpId).orElse(null);

        String managerName = (requester.getCurrentManager().getName() != null && !requester.getCurrentManager().getName().isBlank())
                ? requester.getCurrentManager().getName()
                : (manager != null && manager.getProfile() != null
                ? (manager.getProfile().getFirstName() + " " + manager.getProfile().getLastName()).trim()
                : "Manager");

        String managerEmail = (manager != null && manager.getProfile() != null && manager.getProfile().getEmail() != null)
                ? manager.getProfile().getEmail()
                : (managerUser != null ? managerUser.getEmail() : null);

        String requesterName = formatEmployeeName(requester, request);
        String reason = event.comment() != null ? event.comment() : "";

        // 1. In-App Notification
        Notification notification = Notification.builder()
                .recipientUserId(managerUser != null ? managerUser.getId() : null)
                .recipientEmployeeId(managerEmpId)
                .title("Leave Request Cancelled")
                .message(requesterName + " has cancelled their " + formatLeaveType(request) + " request for "
                        + request.getStartDate() + " to " + request.getEndDate() + " (" + request.getDurationDays() + " days)."
                        + (!reason.isBlank() ? " Reason: \"" + reason + "\"" : ""))
                .type(NotificationType.LEAVE_CANCELLED)
                .read(false)
                .leaveRequestId(request.getId())
                .createdAt(Instant.now())
                .build();
        notificationRepository.save(notification);

        // 2. Email Notification
        if (managerEmail != null && !managerEmail.isBlank()) {
            emailService.sendLeaveNotification(
                    managerEmail,
                    managerName,
                    "[Leave Request Cancelled] " + requesterName + " - " + formatLeaveType(request),
                    "A leave request has been cancelled by " + requesterName + ".",
                    requesterName,
                    formatLeaveType(request),
                    request.getStartDate().toString(),
                    request.getEndDate().toString(),
                    request.getDurationDays(),
                    "CANCELLED",
                    reason
            );
        } else {
            log.info("Manager {} has no email configured. Skipped email delivery.", managerEmpId);
        }
    }

    private String formatEmployeeName(Employee employee, LeaveRequest request) {
        if (employee != null && employee.getProfile() != null) {
            String first = employee.getProfile().getFirstName();
            String last = employee.getProfile().getLastName();
            if (first != null || last != null) {
                return ((first != null ? first : "") + " " + (last != null ? last : "")).trim();
            }
        }
        if (request.getEmployeeSnapshot() != null) {
            String first = request.getEmployeeSnapshot().getFirstName();
            String last = request.getEmployeeSnapshot().getLastName();
            if (first != null || last != null) {
                return ((first != null ? first : "") + " " + (last != null ? last : "")).trim();
            }
        }
        return request.getEmployeeId();
    }

    private String formatLeaveType(LeaveRequest request) {
        if (request.getLeaveTypeCode() == null) return "Leave";
        return request.getLeaveTypeCode().name().replace('_', ' ');
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .recipientUserId(n.getRecipientUserId())
                .recipientEmployeeId(n.getRecipientEmployeeId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .read(n.isRead())
                .leaveRequestId(n.getLeaveRequestId())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
