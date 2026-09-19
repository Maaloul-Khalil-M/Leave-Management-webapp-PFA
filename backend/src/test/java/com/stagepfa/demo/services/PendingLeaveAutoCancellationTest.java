package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.LeaveType;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.domain.events.LeaveRequestEvent;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveRequestRepository;
import com.stagepfa.demo.repositories.LeaveTypeRepository;
import com.stagepfa.demo.services.impl.LeaveRequestServiceImpl;
import com.stagepfa.demo.services.job.PendingLeaveAutoCancellationJob;
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
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PendingLeaveAutoCancellationTest {

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

    @Mock
    private EligibilityService eligibilityService;

    @Mock
    private DurationCalculator durationCalculator;

    @InjectMocks
    private LeaveRequestServiceImpl leaveRequestService;

    private final LocalDate testToday = LocalDate.of(2026, 9, 19);
    private final Clock fixedClock = Clock.fixed(
            Instant.parse("2026-09-19T10:00:00Z"),
            ZoneId.of("UTC")
    );

    @BeforeEach
    void setUp() {
        leaveRequestService.setClock(fixedClock);
    }

    @Test
    void autoCancelExpiredPendingRequests_cancelsPendingLeavesStartingTodayOrEarlier() {
        LeaveRequest reqStartingToday = LeaveRequest.builder()
                .id("req-today")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(testToday)
                .endDate(testToday.plusDays(2))
                .status(LeaveRequestStatus.PENDING)
                .statusHistory(new ArrayList<>())
                .build();

        LeaveRequest reqStartingPast = LeaveRequest.builder()
                .id("req-past")
                .employeeId("emp-2")
                .leaveTypeCode(L_CODE.SICK)
                .startDate(testToday.minusDays(1))
                .endDate(testToday.plusDays(1))
                .status(LeaveRequestStatus.PENDING)
                .statusHistory(new ArrayList<>())
                .build();

        when(leaveRequestRepository.findByStatusAndStartDateLessThanEqual(LeaveRequestStatus.PENDING, testToday))
                .thenReturn(List.of(reqStartingToday, reqStartingPast));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        int count = leaveRequestService.autoCancelExpiredPendingRequests();

        assertEquals(2, count);

        // Verify request 1
        assertEquals(LeaveRequestStatus.CANCELLED, reqStartingToday.getStatus());
        assertEquals(1, reqStartingToday.getStatusHistory().size());
        assertEquals("SYSTEM", reqStartingToday.getStatusHistory().get(0).getByUserId());
        assertEquals(LeaveRequestStatus.PENDING, reqStartingToday.getStatusHistory().get(0).getFromStatus());
        assertEquals(LeaveRequestStatus.CANCELLED, reqStartingToday.getStatusHistory().get(0).getToStatus());
        assertTrue(reqStartingToday.getStatusHistory().get(0).getComment().contains("Automatically cancelled"));

        // Verify request 2
        assertEquals(LeaveRequestStatus.CANCELLED, reqStartingPast.getStatus());
        assertEquals(1, reqStartingPast.getStatusHistory().size());
        assertEquals("SYSTEM", reqStartingPast.getStatusHistory().get(0).getByUserId());

        // Verify events published
        verify(eventPublisher, times(2)).publishEvent(any(LeaveRequestEvent.class));
    }

    @Test
    void pendingLeaveAutoCancellationJob_invokesServiceMethod() {
        LeaveRequestService mockService = mock(LeaveRequestService.class);
        when(mockService.autoCancelExpiredPendingRequests()).thenReturn(5);

        PendingLeaveAutoCancellationJob job = new PendingLeaveAutoCancellationJob(mockService);
        job.runAutoCancellation();

        verify(mockService, times(1)).autoCancelExpiredPendingRequests();
    }

    @Test
    void submitDraft_whenStartDateReached_throwsInvalidStatusTransition() {
        User user = User.builder().id("u-1").employeeId("emp-1").build();
        when(currentUserService.requireLinkedUser()).thenReturn(user);

        LeaveRequest draftStartingToday = LeaveRequest.builder()
                .id("req-draft-today")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(testToday)
                .endDate(testToday.plusDays(2))
                .status(LeaveRequestStatus.DRAFT)
                .build();

        when(leaveRequestRepository.findById("req-draft-today")).thenReturn(Optional.of(draftStartingToday));

        BusinessException ex = assertThrows(
                BusinessException.class,
                () -> leaveRequestService.submit("req-draft-today")
        );

        assertEquals(ErrorCode.INVALID_STATUS_TRANSITION, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("start date has already been reached"));
    }
}
