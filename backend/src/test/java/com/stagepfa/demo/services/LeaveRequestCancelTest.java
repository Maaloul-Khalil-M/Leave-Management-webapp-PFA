package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.LeaveType;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.entities.embedded.LedgerMovement;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.domain.enums.LedgerMovementType;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.domain.events.LeaveRequestEvent;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveRequestRepository;
import com.stagepfa.demo.repositories.LeaveTypeRepository;
import com.stagepfa.demo.services.impl.LeaveRequestServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveRequestCancelTest {

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private OrganizationSettingsService organizationSettingsService;

    @Mock
    private LeavePolicyService leavePolicyService;

    @Mock
    private LeaveLedgerService leaveLedgerService;

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private LeaveRequestServiceImpl leaveRequestService;

    private User ownerUser;
    private final Clock fixedClock = Clock.fixed(
            Instant.parse("2026-09-19T10:00:00Z"),
            ZoneId.of("UTC")
    );

    @BeforeEach
    void setUp() {
        leaveRequestService.setClock(fixedClock);
        ownerUser = User.builder()
                .id("user-1")
                .employeeId("emp-1")
                .build();
    }

    @Test
    void cancelDraft_success() {
        when(currentUserService.requireLinkedUser()).thenReturn(ownerUser);

        LeaveRequest draft = LeaveRequest.builder()
                .id("req-draft")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .durationDays(2.0)
                .startDate(LocalDate.of(2026, 9, 20))
                .endDate(LocalDate.of(2026, 9, 21))
                .status(LeaveRequestStatus.DRAFT)
                .statusHistory(new ArrayList<>())
                .build();

        when(leaveRequestRepository.findById("req-draft")).thenReturn(Optional.of(draft));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        LeaveRequest result = leaveRequestService.cancel("req-draft", "No longer needed");

        assertNotNull(result);
        assertEquals(LeaveRequestStatus.CANCELLED, result.getStatus());
        assertEquals(1, result.getStatusHistory().size());
        assertEquals(LeaveRequestStatus.DRAFT, result.getStatusHistory().get(0).getFromStatus());
        assertEquals(LeaveRequestStatus.CANCELLED, result.getStatusHistory().get(0).getToStatus());
        assertEquals("user-1", result.getStatusHistory().get(0).getByUserId());
        assertEquals("No longer needed", result.getStatusHistory().get(0).getComment());

        verifyNoInteractions(leaveLedgerService);
        verify(eventPublisher).publishEvent(any(LeaveRequestEvent.class));
    }

    @Test
    void cancelPending_beforeStartDate_canBeCancelledManually() {
        when(currentUserService.requireLinkedUser()).thenReturn(ownerUser);

        LeaveRequest pending = LeaveRequest.builder()
                .id("req-pending")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .durationDays(3.0)
                .startDate(LocalDate.of(2026, 9, 20))
                .endDate(LocalDate.of(2026, 9, 22))
                .status(LeaveRequestStatus.PENDING)
                .statusHistory(new ArrayList<>())
                .build();

        when(leaveRequestRepository.findById("req-pending")).thenReturn(Optional.of(pending));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        LeaveRequest result = leaveRequestService.cancel("req-pending", null);

        assertNotNull(result);
        assertEquals(LeaveRequestStatus.CANCELLED, result.getStatus());
        assertEquals(1, result.getStatusHistory().size());
        assertEquals(LeaveRequestStatus.PENDING, result.getStatusHistory().get(0).getFromStatus());
        assertEquals(LeaveRequestStatus.CANCELLED, result.getStatusHistory().get(0).getToStatus());
        assertEquals("Cancelled by employee", result.getStatusHistory().get(0).getComment());

        verifyNoInteractions(leaveLedgerService);
        verify(eventPublisher).publishEvent(any(LeaveRequestEvent.class));
    }

    @Test
    void cancelApproved_beforeStartDate_appendsCompensatingCredit() {
        when(currentUserService.requireLinkedUser()).thenReturn(ownerUser);

        LeaveRequest approved = LeaveRequest.builder()
                .id("req-approved")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .durationDays(4.0)
                .startDate(LocalDate.of(2026, 9, 20))
                .endDate(LocalDate.of(2026, 9, 23))
                .status(LeaveRequestStatus.APPROVED)
                .statusHistory(new ArrayList<>())
                .build();

        LeaveType paidAnnual = LeaveType.builder()
                .code(L_CODE.PAID_ANNUAL)
                .deductsFromBalance(true)
                .build();

        when(leaveRequestRepository.findById("req-approved")).thenReturn(Optional.of(approved));
        when(leaveTypeRepository.findByCode("PAID_ANNUAL")).thenReturn(Optional.of(paidAnnual));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        LeaveRequest result = leaveRequestService.cancel("req-approved", "Trip cancelled");

        assertNotNull(result);
        assertEquals(LeaveRequestStatus.CANCELLED, result.getStatus());

        ArgumentCaptor<LedgerMovement> movementCaptor = ArgumentCaptor.forClass(LedgerMovement.class);
        verify(leaveLedgerService).appendMovement(
                eq("emp-1"),
                eq("PAID_ANNUAL"),
                eq(2026),
                movementCaptor.capture()
        );

        LedgerMovement movement = movementCaptor.getValue();
        assertEquals(LedgerMovementType.CANCELLED_LEAVE_CREDIT, movement.getType());
        assertEquals(4.0, movement.getAmount());
        assertEquals("Trip cancelled", movement.getNote());
        assertEquals("req-approved", movement.getLeaveRequestId());
        assertEquals("user-1", movement.getActorUserId());

        verify(eventPublisher).publishEvent(any(LeaveRequestEvent.class));
    }

    @Test
    void cancelApproved_nonDeductible_noLedgerMovement() {
        when(currentUserService.requireLinkedUser()).thenReturn(ownerUser);

        LeaveRequest approved = LeaveRequest.builder()
                .id("req-sick")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.SICK)
                .durationDays(2.0)
                .startDate(LocalDate.of(2026, 9, 20))
                .endDate(LocalDate.of(2026, 9, 21))
                .status(LeaveRequestStatus.APPROVED)
                .statusHistory(new ArrayList<>())
                .build();

        LeaveType sick = LeaveType.builder()
                .code(L_CODE.SICK)
                .deductsFromBalance(false)
                .build();

        when(leaveRequestRepository.findById("req-sick")).thenReturn(Optional.of(approved));
        when(leaveTypeRepository.findByCode("SICK")).thenReturn(Optional.of(sick));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        LeaveRequest result = leaveRequestService.cancel("req-sick", "Recovered early");

        assertNotNull(result);
        assertEquals(LeaveRequestStatus.CANCELLED, result.getStatus());
        verifyNoInteractions(leaveLedgerService);
    }

    @Test
    void cancelApproved_onStartDate_throwsInvalidStatusTransition() {
        // Today is Sep 19. Set start date to Sep 19 (start date reached).
        when(currentUserService.requireLinkedUser()).thenReturn(ownerUser);

        LeaveRequest started = LeaveRequest.builder()
                .id("req-started")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(LocalDate.of(2026, 9, 19))
                .endDate(LocalDate.of(2026, 9, 22))
                .status(LeaveRequestStatus.APPROVED)
                .build();

        when(leaveRequestRepository.findById("req-started")).thenReturn(Optional.of(started));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> leaveRequestService.cancel("req-started", null));
        assertEquals(ErrorCode.INVALID_STATUS_TRANSITION, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("start date has been reached"));
        verifyNoInteractions(leaveLedgerService);
    }

    @Test
    void cancelApproved_multiDayInProgress_throwsInvalidStatusTransition() {
        // Today is Sep 19. Leave started Sep 18 and ends Sep 22 (in progress).
        when(currentUserService.requireLinkedUser()).thenReturn(ownerUser);

        LeaveRequest inProgress = LeaveRequest.builder()
                .id("req-in-progress")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(LocalDate.of(2026, 9, 18))
                .endDate(LocalDate.of(2026, 9, 22))
                .status(LeaveRequestStatus.APPROVED)
                .build();

        when(leaveRequestRepository.findById("req-in-progress")).thenReturn(Optional.of(inProgress));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> leaveRequestService.cancel("req-in-progress", null));
        assertEquals(ErrorCode.INVALID_STATUS_TRANSITION, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("start date has been reached"));
    }

    @Test
    void cancelApproved_completedLeave_throwsInvalidStatusTransition() {
        // Today is Sep 19. Leave finished Sep 15 (completed in past).
        when(currentUserService.requireLinkedUser()).thenReturn(ownerUser);

        LeaveRequest completed = LeaveRequest.builder()
                .id("req-completed")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(LocalDate.of(2026, 9, 10))
                .endDate(LocalDate.of(2026, 9, 15))
                .status(LeaveRequestStatus.APPROVED)
                .build();

        when(leaveRequestRepository.findById("req-completed")).thenReturn(Optional.of(completed));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> leaveRequestService.cancel("req-completed", null));
        assertEquals(ErrorCode.INVALID_STATUS_TRANSITION, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("start date has been reached"));
    }

    @Test
    void cancelPending_onStartDate_autoCancelsAndRejectsEmployeeCancel() {
        // Today is Sep 19. Pending leave start date is Sep 19 (start date reached).
        when(currentUserService.requireLinkedUser()).thenReturn(ownerUser);

        LeaveRequest pendingExpired = LeaveRequest.builder()
                .id("req-pending-today")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(LocalDate.of(2026, 9, 19))
                .endDate(LocalDate.of(2026, 9, 21))
                .status(LeaveRequestStatus.PENDING)
                .statusHistory(new ArrayList<>())
                .build();

        when(leaveRequestRepository.findById("req-pending-today")).thenReturn(Optional.of(pendingExpired));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> leaveRequestService.cancel("req-pending-today", null));
        assertEquals(ErrorCode.INVALID_STATUS_TRANSITION, ex.getErrorCode());

        // Verify it was auto-cancelled with SYSTEM actor
        assertEquals(LeaveRequestStatus.CANCELLED, pendingExpired.getStatus());
        assertEquals(1, pendingExpired.getStatusHistory().size());
        assertEquals("SYSTEM", pendingExpired.getStatusHistory().get(0).getByUserId());
        assertEquals(LeaveRequestStatus.CANCELLED, pendingExpired.getStatusHistory().get(0).getToStatus());
    }

    @Test
    void cancel_unlinkedUser_throwsForbidden() {
        User unlinked = User.builder().id("unlinked-user").build();
        when(currentUserService.requireLinkedUser()).thenReturn(unlinked);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> leaveRequestService.cancel("req-1", null));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }

    @Test
    void cancel_nonOwner_throwsForbidden() {
        when(currentUserService.requireLinkedUser()).thenReturn(ownerUser);

        LeaveRequest requestOfAnother = LeaveRequest.builder()
                .id("req-other")
                .employeeId("emp-other")
                .status(LeaveRequestStatus.PENDING)
                .build();

        when(leaveRequestRepository.findById("req-other")).thenReturn(Optional.of(requestOfAnother));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> leaveRequestService.cancel("req-other", null));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("not authorized"));
    }

    @Test
    void cancel_alreadyCancelled_throwsInvalidTransition() {
        when(currentUserService.requireLinkedUser()).thenReturn(ownerUser);

        LeaveRequest alreadyCancelled = LeaveRequest.builder()
                .id("req-cancelled")
                .employeeId("emp-1")
                .status(LeaveRequestStatus.CANCELLED)
                .build();

        when(leaveRequestRepository.findById("req-cancelled")).thenReturn(Optional.of(alreadyCancelled));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> leaveRequestService.cancel("req-cancelled", null));
        assertEquals(ErrorCode.INVALID_STATUS_TRANSITION, ex.getErrorCode());
    }

    @Test
    void cancel_rejected_throwsInvalidTransition() {
        when(currentUserService.requireLinkedUser()).thenReturn(ownerUser);

        LeaveRequest rejected = LeaveRequest.builder()
                .id("req-rejected")
                .employeeId("emp-1")
                .status(LeaveRequestStatus.REJECTED)
                .build();

        when(leaveRequestRepository.findById("req-rejected")).thenReturn(Optional.of(rejected));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> leaveRequestService.cancel("req-rejected", null));
        assertEquals(ErrorCode.INVALID_STATUS_TRANSITION, ex.getErrorCode());
    }

    @Test
    void cancel_notFound_throwsResourceNotFound() {
        when(currentUserService.requireLinkedUser()).thenReturn(ownerUser);
        when(leaveRequestRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> leaveRequestService.cancel("missing", null));
    }
}
