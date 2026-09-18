package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.response.ManagerAnalyticsResponse;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.entities.embedded.Assignment;
import com.stagepfa.demo.domain.entities.embedded.EmployeeProfile;
import com.stagepfa.demo.domain.enums.EmploymentStatus;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveRequestRepository;
import com.stagepfa.demo.services.impl.ManagerAnalyticsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ManagerAnalyticsServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private CurrentUserService currentUserService;

    @InjectMocks
    private ManagerAnalyticsServiceImpl managerAnalyticsService;

    private User managerUser;
    private Employee managerEmp;
    private Employee emp1;
    private Employee emp2;

    @BeforeEach
    void setUp() {
        managerUser = User.builder()
                .id("usr-mgr")
                .email("salma@acme.tn")
                .employeeId("emp-mgr")
                .build();

        managerEmp = Employee.builder()
                .id("emp-mgr")
                .employeeNumber("MGR-001")
                .profile(EmployeeProfile.builder().firstName("Salma").lastName("Trabelsi").build())
                .currentAssignment(Assignment.builder().departmentId("dept-eng").departmentLabel("Engineering").build())
                .build();

        emp1 = Employee.builder()
                .id("emp-1")
                .employeeNumber("EMP-001")
                .employmentStatus(EmploymentStatus.ACTIVE)
                .profile(EmployeeProfile.builder().firstName("Ahmed").lastName("Ben Salah").email("ahmed@acme.tn").build())
                .currentAssignment(Assignment.builder().departmentId("dept-eng").departmentLabel("Engineering").positionLabel("Backend Dev").build())
                .build();

        emp2 = Employee.builder()
                .id("emp-2")
                .employeeNumber("EMP-002")
                .employmentStatus(EmploymentStatus.ACTIVE)
                .profile(EmployeeProfile.builder().firstName("Yosra").lastName("Khelifi").email("yosra@acme.tn").build())
                .currentAssignment(Assignment.builder().departmentId("dept-eng").departmentLabel("Engineering").positionLabel("Frontend Dev").build())
                .build();
    }

    @Test
    void testAllPresentWhenNoActiveLeavesToday() {
        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);
        when(employeeRepository.findById("emp-mgr")).thenReturn(Optional.of(managerEmp));
        when(employeeRepository.findByCurrentManagerEmployeeId("emp-mgr")).thenReturn(List.of(emp1, emp2));
        when(leaveRequestRepository.findByEmployeeIdIn(anyCollection())).thenReturn(List.of());

        ManagerAnalyticsResponse res = managerAnalyticsService.getAnalytics("team");

        assertNotNull(res);
        assertEquals(2, res.getPresenceKpi().getTotalMembers());
        assertEquals(2, res.getPresenceKpi().getPresentTodayCount());
        assertEquals(0, res.getPresenceKpi().getOnLeaveTodayCount());
        assertEquals("ALL_PRESENT", res.getPresenceKpi().getLeaveRateStatus());
        assertEquals(0.0, res.getPresenceKpi().getLeaveRatePercentage());
    }

    @Test
    void testActiveLeavesAndLeaveRateClassification() {
        LocalDate today = LocalDate.now();

        LeaveRequest activeLeave = LeaveRequest.builder()
                .id("req-1")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .status(LeaveRequestStatus.APPROVED)
                .startDate(today.minusDays(1))
                .endDate(today.plusDays(1))
                .durationDays(3.0)
                .build();

        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);
        when(employeeRepository.findById("emp-mgr")).thenReturn(Optional.of(managerEmp));
        when(employeeRepository.findByCurrentManagerEmployeeId("emp-mgr")).thenReturn(List.of(emp1, emp2));
        when(leaveRequestRepository.findByEmployeeIdIn(anyCollection())).thenReturn(List.of(activeLeave));

        ManagerAnalyticsResponse res = managerAnalyticsService.getAnalytics("team");

        assertEquals(2, res.getPresenceKpi().getTotalMembers());
        assertEquals(1, res.getPresenceKpi().getPresentTodayCount());
        assertEquals(1, res.getPresenceKpi().getOnLeaveTodayCount());
        assertEquals(50.0, res.getPresenceKpi().getLeaveRatePercentage());
        assertEquals("HIGH", res.getPresenceKpi().getLeaveRateStatus());

        // Roster check
        var r1 = res.getTeamRoster().stream().filter(r -> r.getEmployeeId().equals("emp-1")).findFirst().orElseThrow();
        assertEquals("ON_LEAVE", r1.getPresenceStatus());
        assertEquals(L_CODE.PAID_ANNUAL, r1.getActiveLeaveTypeCode());

        var r2 = res.getTeamRoster().stream().filter(r -> r.getEmployeeId().equals("emp-2")).findFirst().orElseThrow();
        assertEquals("PRESENT", r2.getPresenceStatus());
    }

    @Test
    void testApprovalRateAndStalePendingDetection() {
        Instant now = Instant.now();
        Instant fiveDaysAgo = now.minus(5, ChronoUnit.DAYS);
        Instant oneHourAgo = now.minus(1, ChronoUnit.HOURS);

        LeaveRequest approved = LeaveRequest.builder()
                .id("r-app")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .status(LeaveRequestStatus.APPROVED)
                .durationDays(3.0)
                .build();

        LeaveRequest rejected = LeaveRequest.builder()
                .id("r-rej")
                .employeeId("emp-2")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .status(LeaveRequestStatus.REJECTED)
                .durationDays(2.0)
                .build();

        LeaveRequest stalePending = LeaveRequest.builder()
                .id("r-stale")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.SICK)
                .status(LeaveRequestStatus.PENDING)
                .submittedAt(fiveDaysAgo)
                .durationDays(1.0)
                .build();

        LeaveRequest freshPending = LeaveRequest.builder()
                .id("r-fresh")
                .employeeId("emp-2")
                .leaveTypeCode(L_CODE.UNPAID)
                .status(LeaveRequestStatus.PENDING)
                .submittedAt(oneHourAgo)
                .durationDays(1.0)
                .build();

        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);
        when(employeeRepository.findById("emp-mgr")).thenReturn(Optional.of(managerEmp));
        when(employeeRepository.findByCurrentManagerEmployeeId("emp-mgr")).thenReturn(List.of(emp1, emp2));
        when(leaveRequestRepository.findByEmployeeIdIn(anyCollection()))
                .thenReturn(List.of(approved, rejected, stalePending, freshPending));

        ManagerAnalyticsResponse res = managerAnalyticsService.getAnalytics("team");

        var appKpi = res.getApprovalKpi();
        assertEquals(4, appKpi.getTotalRequests());
        assertEquals(1, appKpi.getApprovedCount());
        assertEquals(1, appKpi.getRejectedCount());
        assertEquals(2, appKpi.getPendingCount());
        assertEquals(1, appKpi.getStalePendingCount()); // Only r-stale (> 3 days)
        assertEquals(50.0, appKpi.getApprovalRatePercentage()); // 1 / (1 + 1) * 100
    }

    @Test
    void testCalendarHeatmapAggregation() {
        LocalDate start = LocalDate.of(2026, 6, 8);
        LocalDate end = LocalDate.of(2026, 6, 10);

        LeaveRequest approved1 = LeaveRequest.builder()
                .id("r-1")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .status(LeaveRequestStatus.APPROVED)
                .startDate(start)
                .endDate(end)
                .durationDays(3.0)
                .build();

        LeaveRequest approved2 = LeaveRequest.builder()
                .id("r-2")
                .employeeId("emp-2")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .status(LeaveRequestStatus.APPROVED)
                .startDate(start)
                .endDate(start.plusDays(1)) // 8 and 9
                .durationDays(2.0)
                .build();

        when(currentUserService.requireLinkedUser()).thenReturn(managerUser);
        when(employeeRepository.findById("emp-mgr")).thenReturn(Optional.of(managerEmp));
        when(employeeRepository.findByCurrentManagerEmployeeId("emp-mgr")).thenReturn(List.of(emp1, emp2));
        when(leaveRequestRepository.findByEmployeeIdIn(anyCollection()))
                .thenReturn(List.of(approved1, approved2));

        ManagerAnalyticsResponse res = managerAnalyticsService.getAnalytics("team");

        assertNotNull(res.getHeatmapData());
        var day8 = res.getHeatmapData().stream().filter(d -> d.getDate().equals("2026-06-08")).findFirst().orElseThrow();
        assertEquals(2, day8.getAbsentCount()); // Both emp1 and emp2
        assertTrue(day8.getAbsentEmployeeNames().contains("Ahmed Ben Salah"));
        assertTrue(day8.getAbsentEmployeeNames().contains("Yosra Khelifi"));

        var day10 = res.getHeatmapData().stream().filter(d -> d.getDate().equals("2026-06-10")).findFirst().orElseThrow();
        assertEquals(1, day10.getAbsentCount()); // Only emp1
    }
}
