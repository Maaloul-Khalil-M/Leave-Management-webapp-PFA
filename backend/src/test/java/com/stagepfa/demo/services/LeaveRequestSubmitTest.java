package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveRequestRepository;
import com.stagepfa.demo.services.impl.LeaveRequestServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
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
                .status(LeaveRequestStatus.DRAFT)
                .statusHistory(new ArrayList<>())
                .build();

        when(leaveRequestRepository.findById("req1")).thenReturn(Optional.of(existing));
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
