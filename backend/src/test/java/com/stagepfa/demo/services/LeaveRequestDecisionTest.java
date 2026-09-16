package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.LeaveType;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.entities.embedded.ManagerRef;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.domain.enums.LedgerMovementType;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
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

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveRequestDecisionTest {

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

    @InjectMocks
    private LeaveRequestServiceImpl leaveRequestService;

    private User managerUser;
    private Employee requesterEmployee;
    private LeaveRequest pendingPaidAnnualRequest;
    private LeaveType paidAnnualType;

    @BeforeEach
    void setUp() {
        managerUser = User.builder()
                .id("mgr-user-1")
                .employeeId("mgr-emp-1")
                .build();

        requesterEmployee = Employee.builder()
                .id("emp-1")
                .currentManager(ManagerRef.builder()
                        .employeeId("mgr-emp-1")
                        .name("Manager One")
                        .build())
                .build();

        pendingPaidAnnualRequest = LeaveRequest.builder()
                .id("req-1")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .durationDays(3.0)
                .startDate(LocalDate.of(2026, 7, 1))
                .endDate(LocalDate.of(2026, 7, 3))
                .status(LeaveRequestStatus.PENDING)
                .statusHistory(new ArrayList<>())
                .build();

        paidAnnualType = LeaveType.builder()
                .code(L_CODE.PAID_ANNUAL)
                .deductsFromBalance(true)
                .build();
    }

    @Test
    void testApproveSuccessWithBalanceDebit() {
        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);
        when(leaveRequestRepository.findById("req-1")).thenReturn(Optional.of(pendingPaidAnnualRequest));
        when(employeeRepository.findById("emp-1")).thenReturn(Optional.of(requesterEmployee));
        when(leaveTypeRepository.findByCode("PAID_ANNUAL")).thenReturn(Optional.of(paidAnnualType));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        LeaveRequest result = leaveRequestService.approve("req-1", "Approved, have a good break!");

        assertNotNull(result);
        assertEquals(LeaveRequestStatus.APPROVED, result.getStatus());
        assertEquals("mgr-user-1", result.getValidatedBy());
        assertEquals("Approved, have a good break!", result.getValidationComment());
        assertNotNull(result.getValidatedAt());

        // Verify status history
        assertEquals(1, result.getStatusHistory().size());
        var history = result.getStatusHistory().get(0);
        assertEquals(LeaveRequestStatus.PENDING, history.getFromStatus());
        assertEquals(LeaveRequestStatus.APPROVED, history.getToStatus());
        assertEquals("mgr-user-1", history.getByUserId());

        // Verify ledger debit movement
        verify(leaveLedgerService, times(1)).appendMovement(
                eq("emp-1"),
                eq("PAID_ANNUAL"),
                eq(2026),
                argThat(m -> m.getType() == LedgerMovementType.APPROVED_LEAVE_DEBIT
                        && m.getAmount() == 3.0
                        && "req-1".equals(m.getLeaveRequestId())
                        && "mgr-user-1".equals(m.getActorUserId()))
        );
        verify(leaveRequestRepository, times(1)).save(pendingPaidAnnualRequest);
    }

    @Test
    void testApproveSuccessWithoutBalanceDebit() {
        LeaveRequest pendingSickRequest = LeaveRequest.builder()
                .id("req-sick")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.SICK)
                .durationDays(2.0)
                .startDate(LocalDate.of(2026, 8, 1))
                .endDate(LocalDate.of(2026, 8, 2))
                .status(LeaveRequestStatus.PENDING)
                .statusHistory(new ArrayList<>())
                .build();

        LeaveType sickType = LeaveType.builder()
                .code(L_CODE.SICK)
                .deductsFromBalance(false)
                .build();

        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);
        when(leaveRequestRepository.findById("req-sick")).thenReturn(Optional.of(pendingSickRequest));
        when(employeeRepository.findById("emp-1")).thenReturn(Optional.of(requesterEmployee));
        when(leaveTypeRepository.findByCode("SICK")).thenReturn(Optional.of(sickType));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        LeaveRequest result = leaveRequestService.approve("req-sick", null);

        assertNotNull(result);
        assertEquals(LeaveRequestStatus.APPROVED, result.getStatus());

        // Verify no ledger debit was performed
        verify(leaveLedgerService, never()).appendMovement(any(), any(), anyInt(), any());
        verify(leaveRequestRepository, times(1)).save(pendingSickRequest);
    }

    @Test
    void testApproveFailsWhenNotManagerOfEmployee() {
        User otherManager = User.builder()
                .id("mgr-user-2")
                .employeeId("mgr-emp-2")
                .build();

        when(currentUserService.requireLinkedUser()).thenReturn(otherManager);
        when(leaveRequestRepository.findById("req-1")).thenReturn(Optional.of(pendingPaidAnnualRequest));
        when(employeeRepository.findById("emp-1")).thenReturn(Optional.of(requesterEmployee));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> leaveRequestService.approve("req-1", "Approve attempt")
        );
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("not the manager"));
        verify(leaveLedgerService, never()).appendMovement(any(), any(), anyInt(), any());
    }

    @Test
    void testApproveFailsSelfApproval() {
        // Manager attempts to approve their own request
        LeaveRequest managersOwnRequest = LeaveRequest.builder()
                .id("req-mgr")
                .employeeId("mgr-emp-1")
                .status(LeaveRequestStatus.PENDING)
                .build();

        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);
        when(leaveRequestRepository.findById("req-mgr")).thenReturn(Optional.of(managersOwnRequest));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> leaveRequestService.approve("req-mgr", "Self approve")
        );
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("cannot approve their own"));
    }

    @Test
    void testApproveFailsWhenNotPending() {
        LeaveRequest draftRequest = LeaveRequest.builder()
                .id("req-draft")
                .employeeId("emp-1")
                .status(LeaveRequestStatus.DRAFT)
                .build();

        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);
        when(leaveRequestRepository.findById("req-draft")).thenReturn(Optional.of(draftRequest));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> leaveRequestService.approve("req-draft", "Approve draft")
        );
        assertEquals(ErrorCode.INVALID_STATUS_TRANSITION, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("pending"));
    }

    @Test
    void testApproveFailsWhenInsufficientBalance() {
        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);
        when(leaveRequestRepository.findById("req-1")).thenReturn(Optional.of(pendingPaidAnnualRequest));
        when(employeeRepository.findById("emp-1")).thenReturn(Optional.of(requesterEmployee));
        when(leaveTypeRepository.findByCode("PAID_ANNUAL")).thenReturn(Optional.of(paidAnnualType));

        when(leaveLedgerService.appendMovement(any(), any(), anyInt(), any()))
                .thenThrow(new BusinessException(ErrorCode.INSUFFICIENT_BALANCE, "Insufficient leave balance"));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> leaveRequestService.approve("req-1", "Approve attempt")
        );
        assertEquals(ErrorCode.INSUFFICIENT_BALANCE, ex.getErrorCode());
        verify(leaveRequestRepository, never()).save(any());
    }

    @Test
    void testRejectSuccess() {
        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);
        when(leaveRequestRepository.findById("req-1")).thenReturn(Optional.of(pendingPaidAnnualRequest));
        when(employeeRepository.findById("emp-1")).thenReturn(Optional.of(requesterEmployee));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        LeaveRequest result = leaveRequestService.reject("req-1", "Critical team delivery scheduled during those dates.");

        assertNotNull(result);
        assertEquals(LeaveRequestStatus.REJECTED, result.getStatus());
        assertEquals("mgr-user-1", result.getValidatedBy());
        assertEquals("Critical team delivery scheduled during those dates.", result.getValidationComment());
        assertNotNull(result.getValidatedAt());

        // Verify status history
        assertEquals(1, result.getStatusHistory().size());
        var history = result.getStatusHistory().get(0);
        assertEquals(LeaveRequestStatus.PENDING, history.getFromStatus());
        assertEquals(LeaveRequestStatus.REJECTED, history.getToStatus());
        assertEquals("Critical team delivery scheduled during those dates.", history.getComment());

        // Verify NO ledger debit was performed
        verify(leaveLedgerService, never()).appendMovement(any(), any(), anyInt(), any());
        verify(leaveRequestRepository, times(1)).save(pendingPaidAnnualRequest);
    }

    @Test
    void testRejectFailsWhenCommentBlank() {
        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> leaveRequestService.reject("req-1", "   ")
        );
        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Comment is required"));
    }

    @Test
    void testRejectFailsWhenNotManager() {
        User otherManager = User.builder()
                .id("mgr-user-2")
                .employeeId("mgr-emp-2")
                .build();

        when(currentUserService.requireLinkedUser()).thenReturn(otherManager);
        when(leaveRequestRepository.findById("req-1")).thenReturn(Optional.of(pendingPaidAnnualRequest));
        when(employeeRepository.findById("emp-1")).thenReturn(Optional.of(requesterEmployee));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> leaveRequestService.reject("req-1", "Reject reason")
        );
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }

    @Test
    void testRejectFailsSelfRejection() {
        LeaveRequest managersOwnRequest = LeaveRequest.builder()
                .id("req-mgr")
                .employeeId("mgr-emp-1")
                .status(LeaveRequestStatus.PENDING)
                .build();

        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);
        when(leaveRequestRepository.findById("req-mgr")).thenReturn(Optional.of(managersOwnRequest));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> leaveRequestService.reject("req-mgr", "Self reject")
        );
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("cannot reject their own"));
    }

    @Test
    void testListPendingTeamRequests() {
        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);
        when(employeeRepository.findByCurrentManagerEmployeeId("mgr-emp-1"))
                .thenReturn(List.of(requesterEmployee));
        when(leaveRequestRepository.findByEmployeeIdInAndStatus(List.of("emp-1"), LeaveRequestStatus.PENDING))
                .thenReturn(List.of(pendingPaidAnnualRequest));

        List<LeaveRequest> list = leaveRequestService.listPendingTeamRequests();

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals("req-1", list.get(0).getId());
    }
}
