package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.response.NotificationResponse;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.Notification;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.entities.embedded.EmployeeProfile;
import com.stagepfa.demo.domain.entities.embedded.ManagerRef;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.domain.enums.NotificationType;
import com.stagepfa.demo.domain.events.LeaveRequestEvent;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.NotificationRepository;
import com.stagepfa.demo.repositories.UserRepository;
import com.stagepfa.demo.services.impl.NotificationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private Employee requester;
    private Employee manager;
    private User managerUser;
    private User requesterUser;
    private LeaveRequest leaveRequest;

    @BeforeEach
    void setUp() {
        requester = Employee.builder()
                .id("emp-1")
                .employeeNumber("E001")
                .profile(EmployeeProfile.builder()
                        .firstName("Ahmed")
                        .lastName("Trabelsi")
                        .email("ahmed@acme.tn")
                        .build())
                .currentManager(ManagerRef.builder()
                        .employeeId("mgr-1")
                        .name("Salma Mansour")
                        .build())
                .build();

        manager = Employee.builder()
                .id("mgr-1")
                .employeeNumber("M001")
                .profile(EmployeeProfile.builder()
                        .firstName("Salma")
                        .lastName("Mansour")
                        .email("salma@acme.tn")
                        .build())
                .build();

        managerUser = User.builder()
                .id("user-mgr-1")
                .employeeId("mgr-1")
                .email("salma@acme.tn")
                .build();

        requesterUser = User.builder()
                .id("user-emp-1")
                .employeeId("emp-1")
                .email("ahmed@acme.tn")
                .build();

        leaveRequest = LeaveRequest.builder()
                .id("lr-100")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(LocalDate.of(2026, 8, 10))
                .endDate(LocalDate.of(2026, 8, 14))
                .durationDays(5.0)
                .reason("Summer trip")
                .status(LeaveRequestStatus.PENDING)
                .build();
    }

    @Test
    void testHandleSubmittedEvent_createsNotificationAndSendsEmail() {
        when(employeeRepository.findById("emp-1")).thenReturn(Optional.of(requester));
        when(employeeRepository.findById("mgr-1")).thenReturn(Optional.of(manager));
        when(userRepository.findByEmployeeId("mgr-1")).thenReturn(Optional.of(managerUser));

        LeaveRequestEvent event = new LeaveRequestEvent(
                leaveRequest,
                LeaveRequestStatus.DRAFT,
                LeaveRequestStatus.PENDING,
                "user-emp-1",
                null
        );

        notificationService.handleLeaveRequestEvent(event);

        // Verify In-App Notification created
        ArgumentCaptor<Notification> notifCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).save(notifCaptor.capture());
        Notification savedNotif = notifCaptor.getValue();
        assertEquals("user-mgr-1", savedNotif.getRecipientUserId());
        assertEquals("mgr-1", savedNotif.getRecipientEmployeeId());
        assertEquals(NotificationType.LEAVE_SUBMITTED, savedNotif.getType());
        assertEquals("Leave Request Submitted", savedNotif.getTitle());
        assertTrue(savedNotif.getMessage().contains("Ahmed Trabelsi"));
        assertFalse(savedNotif.isRead());

        // Verify Email Dispatched
        verify(emailService, times(1)).sendLeaveNotification(
                eq("salma@acme.tn"),
                eq("Salma Mansour"),
                contains("[Leave Request Submitted]"),
                anyString(),
                eq("Ahmed Trabelsi"),
                eq("PAID ANNUAL"),
                eq("2026-08-10"),
                eq("2026-08-14"),
                eq(5.0),
                eq("PENDING"),
                eq("Summer trip")
        );
    }

    @Test
    void testHandleSubmittedEvent_withoutManager_skipsCleanly() {
        requester.setCurrentManager(null);
        when(employeeRepository.findById("emp-1")).thenReturn(Optional.of(requester));

        LeaveRequestEvent event = new LeaveRequestEvent(
                leaveRequest,
                LeaveRequestStatus.DRAFT,
                LeaveRequestStatus.PENDING,
                "user-emp-1",
                null
        );

        notificationService.handleLeaveRequestEvent(event);

        verify(notificationRepository, never()).save(any());
        verify(emailService, never()).sendLeaveNotification(any(), any(), any(), any(), any(), any(), any(), any(), anyDouble(), any(), any());
    }

    @Test
    void testHandleApprovedEvent_createsNotificationAndSendsEmail() {
        when(employeeRepository.findById("emp-1")).thenReturn(Optional.of(requester));
        when(userRepository.findByEmployeeId("emp-1")).thenReturn(Optional.of(requesterUser));

        leaveRequest.setStatus(LeaveRequestStatus.APPROVED);

        LeaveRequestEvent event = new LeaveRequestEvent(
                leaveRequest,
                LeaveRequestStatus.PENDING,
                LeaveRequestStatus.APPROVED,
                "user-mgr-1",
                "Approved. Enjoy your vacation!"
        );

        notificationService.handleLeaveRequestEvent(event);

        ArgumentCaptor<Notification> notifCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).save(notifCaptor.capture());
        Notification savedNotif = notifCaptor.getValue();
        assertEquals("user-emp-1", savedNotif.getRecipientUserId());
        assertEquals("emp-1", savedNotif.getRecipientEmployeeId());
        assertEquals(NotificationType.LEAVE_APPROVED, savedNotif.getType());
        assertTrue(savedNotif.getMessage().contains("Approved. Enjoy your vacation!"));

        verify(emailService, times(1)).sendLeaveNotification(
                eq("ahmed@acme.tn"),
                eq("Ahmed Trabelsi"),
                contains("[Leave Request Approved]"),
                anyString(),
                eq("Ahmed Trabelsi"),
                eq("PAID ANNUAL"),
                eq("2026-08-10"),
                eq("2026-08-14"),
                eq(5.0),
                eq("APPROVED"),
                eq("Approved. Enjoy your vacation!")
        );
    }

    @Test
    void testHandleRejectedEvent_createsNotificationAndSendsEmail() {
        when(employeeRepository.findById("emp-1")).thenReturn(Optional.of(requester));
        when(userRepository.findByEmployeeId("emp-1")).thenReturn(Optional.of(requesterUser));

        leaveRequest.setStatus(LeaveRequestStatus.REJECTED);

        LeaveRequestEvent event = new LeaveRequestEvent(
                leaveRequest,
                LeaveRequestStatus.PENDING,
                LeaveRequestStatus.REJECTED,
                "user-mgr-1",
                "Conflict with sprint release"
        );

        notificationService.handleLeaveRequestEvent(event);

        ArgumentCaptor<Notification> notifCaptor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).save(notifCaptor.capture());
        Notification savedNotif = notifCaptor.getValue();
        assertEquals("user-emp-1", savedNotif.getRecipientUserId());
        assertEquals("emp-1", savedNotif.getRecipientEmployeeId());
        assertEquals(NotificationType.LEAVE_REJECTED, savedNotif.getType());
        assertTrue(savedNotif.getMessage().contains("Conflict with sprint release"));

        verify(emailService, times(1)).sendLeaveNotification(
                eq("ahmed@acme.tn"),
                eq("Ahmed Trabelsi"),
                contains("[Leave Request Rejected]"),
                anyString(),
                eq("Ahmed Trabelsi"),
                eq("PAID ANNUAL"),
                eq("2026-08-10"),
                eq("2026-08-14"),
                eq(5.0),
                eq("REJECTED"),
                eq("Conflict with sprint release")
        );
    }

    @Test
    void testListMyNotifications() {
        when(currentUserService.requireLinkedUser()).thenReturn(requesterUser);

        Notification n1 = Notification.builder()
                .id("notif-1")
                .recipientUserId("user-emp-1")
                .recipientEmployeeId("emp-1")
                .title("Test Title")
                .message("Test Message")
                .type(NotificationType.LEAVE_APPROVED)
                .read(false)
                .createdAt(Instant.now())
                .build();

        when(notificationRepository.findByRecipientUserIdOrRecipientEmployeeIdOrderByCreatedAtDesc("user-emp-1", "emp-1"))
                .thenReturn(List.of(n1));

        List<NotificationResponse> result = notificationService.listMyNotifications();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("notif-1", result.get(0).getId());
        assertEquals("Test Title", result.get(0).getTitle());
    }

    @Test
    void testMarkAsRead() {
        when(currentUserService.requireLinkedUser()).thenReturn(requesterUser);

        Notification n1 = Notification.builder()
                .id("notif-1")
                .recipientUserId("user-emp-1")
                .recipientEmployeeId("emp-1")
                .read(false)
                .build();

        when(notificationRepository.findById("notif-1")).thenReturn(Optional.of(n1));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        NotificationResponse response = notificationService.markAsRead("notif-1");

        assertNotNull(response);
        assertTrue(response.isRead());
        verify(notificationRepository, times(1)).save(n1);
    }

    @Test
    void testMarkAsRead_forbiddenForOtherUser() {
        when(currentUserService.requireLinkedUser()).thenReturn(requesterUser);

        Notification otherUserNotif = Notification.builder()
                .id("notif-2")
                .recipientUserId("other-user")
                .recipientEmployeeId("other-emp")
                .read(false)
                .build();

        when(notificationRepository.findById("notif-2")).thenReturn(Optional.of(otherUserNotif));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> notificationService.markAsRead("notif-2")
        );
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        verify(notificationRepository, never()).save(any());
    }
}
