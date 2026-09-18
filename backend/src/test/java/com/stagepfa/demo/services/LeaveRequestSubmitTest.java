package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.response.EligibilityResponse;
import com.stagepfa.demo.domain.dtos.response.Explanation;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.enums.ExplanationSeverity;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveRequestRepository;
import com.stagepfa.demo.services.CurrentUserService;
import com.stagepfa.demo.services.DurationCalculator;
import com.stagepfa.demo.services.EligibilityService;
import com.stagepfa.demo.services.LeavePolicyService;
import com.stagepfa.demo.services.OrganizationSettingsService;
import com.stagepfa.demo.services.impl.LeaveRequestServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveRequestSubmitTest {

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
    private EligibilityService eligibilityService;

    @Mock
    private DurationCalculator durationCalculator;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private LeaveRequestServiceImpl leaveRequestService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id("u123")
                .employeeId("emp123")
                .build();
    }

    @Test
    void testSubmitSuccess() {
        when(currentUserService.requireLinkedUser()).thenReturn(user);

        LeaveRequest existing = LeaveRequest.builder()
                .id("req1")
                .employeeId("emp123")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 10, 5))
                .status(LeaveRequestStatus.DRAFT)
                .statusHistory(new ArrayList<>())
                .build();

        Employee employee = Employee.builder().id("emp123").build();

        when(leaveRequestRepository.findById("req1")).thenReturn(Optional.of(existing));
        when(employeeRepository.findById("emp123")).thenReturn(Optional.of(employee));
        when(eligibilityService.check(any(), any())).thenReturn(
                EligibilityResponse.builder().eligible(true).build()
        );
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        LeaveRequest submitted = leaveRequestService.submit("req1");

        assertNotNull(submitted);
        assertEquals(LeaveRequestStatus.PENDING, submitted.getStatus());
        assertNotNull(submitted.getSubmittedAt());
        assertEquals(1, submitted.getStatusHistory().size());

        var historyEntry = submitted.getStatusHistory().get(0);
        assertEquals(LeaveRequestStatus.DRAFT, historyEntry.getFromStatus());
        assertEquals(LeaveRequestStatus.PENDING, historyEntry.getToStatus());
        assertEquals("u123", historyEntry.getByUserId());
        assertNotNull(historyEntry.getAt());

        verify(leaveRequestRepository, times(1)).save(existing);
    }

    @Test
    void testSubmitFailsWhenInsufficientBalance() {
        when(currentUserService.requireLinkedUser()).thenReturn(user);

        LeaveRequest existing = LeaveRequest.builder()
                .id("req1")
                .employeeId("emp123")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 10, 10))
                .status(LeaveRequestStatus.DRAFT)
                .statusHistory(new ArrayList<>())
                .build();

        Employee employee = Employee.builder().id("emp123").build();

        when(leaveRequestRepository.findById("req1")).thenReturn(Optional.of(existing));
        when(employeeRepository.findById("emp123")).thenReturn(Optional.of(employee));

        Explanation exp = Explanation.builder()
                .code("INSUFFICIENT_BALANCE")
                .severity(ExplanationSeverity.BLOCKING)
                .title("Not enough paid leave")
                .body("You're asking for 10.0 days but only have 7.0 available right now.")
                .build();

        when(eligibilityService.check(any(), any())).thenReturn(
                EligibilityResponse.builder()
                        .eligible(false)
                        .blockingCode("INSUFFICIENT_BALANCE")
                        .reasons(List.of("Insufficient balance: available=7.0, required=10.0"))
                        .explanations(List.of(exp))
                        .build()
        );

        BusinessException ex = assertThrows(BusinessException.class, () -> leaveRequestService.submit("req1"));
        assertEquals(ErrorCode.INSUFFICIENT_BALANCE, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Insufficient balance"));
        assertEquals(1, ex.getDetails().size());
        assertEquals("INSUFFICIENT_BALANCE", ex.getDetails().get(0).getCode());
        verify(leaveRequestRepository, never()).save(any());
    }

    @Test
    void testSubmitFailsWhenOverlapDetected() {
        when(currentUserService.requireLinkedUser()).thenReturn(user);

        LeaveRequest existing = LeaveRequest.builder()
                .id("req1")
                .employeeId("emp123")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 10, 5))
                .status(LeaveRequestStatus.DRAFT)
                .statusHistory(new ArrayList<>())
                .build();

        Employee employee = Employee.builder().id("emp123").build();

        when(leaveRequestRepository.findById("req1")).thenReturn(Optional.of(existing));
        when(employeeRepository.findById("emp123")).thenReturn(Optional.of(employee));

        Explanation exp = Explanation.builder()
                .code("OVERLAP_DETECTED")
                .severity(ExplanationSeverity.BLOCKING)
                .title("Overlaps approved leave")
                .body("These dates overlap leave that is already approved.")
                .build();

        when(eligibilityService.check(any(), any())).thenReturn(
                EligibilityResponse.builder()
                        .eligible(false)
                        .blockingCode("OVERLAP_DETECTED")
                        .reasons(List.of("Overlaps with approved leave request(s): [req-other]"))
                        .explanations(List.of(exp))
                        .build()
        );

        BusinessException ex = assertThrows(BusinessException.class, () -> leaveRequestService.submit("req1"));
        assertEquals(ErrorCode.OVERLAP_DETECTED, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Overlaps"));
        verify(leaveRequestRepository, never()).save(any());
    }

    @Test
    void testSubmitNotFound() {
        when(currentUserService.requireLinkedUser()).thenReturn(user);
        when(leaveRequestRepository.findById("req-missing")).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(
                ResourceNotFoundException.class,
                () -> leaveRequestService.submit("req-missing")
        );
        assertEquals(ErrorCode.RESOURCE_NOT_FOUND, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("req-missing"));
    }

    @Test
    void testSubmitForbiddenNotOwner() {
        when(currentUserService.requireLinkedUser()).thenReturn(user);

        LeaveRequest otherEmployeesRequest = LeaveRequest.builder()
                .id("req2")
                .employeeId("emp999")
                .status(LeaveRequestStatus.DRAFT)
                .build();

        when(leaveRequestRepository.findById("req2")).thenReturn(Optional.of(otherEmployeesRequest));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> leaveRequestService.submit("req2")
        );
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("not authorized"));
    }

    @Test
    void testSubmitInvalidStatusTransition() {
        when(currentUserService.requireLinkedUser()).thenReturn(user);

        LeaveRequest alreadyPending = LeaveRequest.builder()
                .id("req3")
                .employeeId("emp123")
                .status(LeaveRequestStatus.PENDING)
                .build();

        when(leaveRequestRepository.findById("req3")).thenReturn(Optional.of(alreadyPending));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> leaveRequestService.submit("req3")
        );
        assertEquals(ErrorCode.INVALID_STATUS_TRANSITION, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("draft"));
    }

    @Test
    void testSubmitUnlinkedUser() {
        User unlinkedUser = User.builder()
                .id("u-unlinked")
                .employeeId(null)
                .build();

        when(currentUserService.requireLinkedUser()).thenReturn(unlinkedUser);

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> leaveRequestService.submit("req4")
        );
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }
}
