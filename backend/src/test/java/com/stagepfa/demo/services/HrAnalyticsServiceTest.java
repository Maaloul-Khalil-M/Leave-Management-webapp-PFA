package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.response.HrAnalyticsResponse;
import com.stagepfa.demo.domain.entities.Department;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.embedded.Assignment;
import com.stagepfa.demo.domain.entities.embedded.EmployeeProfile;
import com.stagepfa.demo.domain.enums.EmploymentStatus;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.repositories.DepartmentRepository;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveRequestRepository;
import com.stagepfa.demo.services.impl.HrAnalyticsServiceImpl;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrAnalyticsServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private HrAnalyticsServiceImpl hrAnalyticsService;

    private Department deptEngineering;
    private Department deptHr;
    private Employee empEng;
    private Employee empHr;

    @BeforeEach
    void setUp() {
        deptEngineering = Department.builder()
                .id("dept-eng")
                .label("Engineering")
                .build();

        deptHr = Department.builder()
                .id("dept-hr")
                .label("Human Resources")
                .build();

        empEng = Employee.builder()
                .id("emp-1")
                .employeeNumber("EMP-001")
                .employmentStatus(EmploymentStatus.ACTIVE)
                .profile(EmployeeProfile.builder().firstName("Ahmed").lastName("Ben Salah").email("ahmed@acme.tn").build())
                .currentAssignment(Assignment.builder().departmentId("dept-eng").departmentLabel("Engineering").positionLabel("Backend Dev").build())
                .build();

        empHr = Employee.builder()
                .id("emp-2")
                .employeeNumber("HR-001")
                .employmentStatus(EmploymentStatus.ACTIVE)
                .profile(EmployeeProfile.builder().firstName("Leila").lastName("Mansouri").email("leila@acme.tn").build())
                .currentAssignment(Assignment.builder().departmentId("dept-hr").departmentLabel("Human Resources").positionLabel("HR Specialist").build())
                .build();
    }

    @Test
    void testCompanyWideAggregation() {
        when(departmentRepository.findAll()).thenReturn(List.of(deptEngineering, deptHr));
        when(employeeRepository.findAll()).thenReturn(List.of(empEng, empHr));

        LocalDate today = LocalDate.now();
        LeaveRequest activeLeave = LeaveRequest.builder()
                .id("r-1")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .status(LeaveRequestStatus.APPROVED)
                .startDate(today.minusDays(1))
                .endDate(today.plusDays(1))
                .durationDays(3.0)
                .build();

        when(leaveRequestRepository.findAll()).thenReturn(List.of(activeLeave));

        HrAnalyticsResponse res = hrAnalyticsService.getAnalytics("ALL");

        assertNotNull(res);
        assertEquals("ALL", res.getOrganizationSummary().getActiveScope());
        assertEquals(2, res.getOrganizationSummary().getTotalWorkforce());
        assertEquals(2, res.getOrganizationSummary().getTotalDepartments());

        // Presence KPI: 1 present, 1 on leave -> 50%
        assertEquals(2, res.getPresenceKpi().getTotalMembers());
        assertEquals(1, res.getPresenceKpi().getPresentTodayCount());
        assertEquals(1, res.getPresenceKpi().getOnLeaveTodayCount());
        assertEquals(50.0, res.getPresenceKpi().getLeaveRatePercentage());
        assertEquals("HIGH", res.getPresenceKpi().getLeaveRateStatus());

        // Department breakdown check
        assertEquals(2, res.getDepartmentStats().size());
        var engStat = res.getDepartmentStats().stream().filter(s -> s.getDepartmentId().equals("dept-eng")).findFirst().orElseThrow();
        assertEquals(1, engStat.getHeadcount());
        assertEquals(1, engStat.getOnLeaveCount());
        assertEquals(100.0, engStat.getLeaveRatePercentage());

        var hrStat = res.getDepartmentStats().stream().filter(s -> s.getDepartmentId().equals("dept-hr")).findFirst().orElseThrow();
        assertEquals(1, hrStat.getHeadcount());
        assertEquals(0, hrStat.getOnLeaveCount());
        assertEquals(0.0, hrStat.getLeaveRatePercentage());
    }

    @Test
    void testDepartmentFiltering() {
        when(departmentRepository.findAll()).thenReturn(List.of(deptEngineering, deptHr));
        when(employeeRepository.findAll()).thenReturn(List.of(empEng, empHr));
        when(employeeRepository.findByCurrentAssignmentDepartmentId("dept-eng")).thenReturn(List.of(empEng));

        LeaveRequest reqEng = LeaveRequest.builder()
                .id("r-eng")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .status(LeaveRequestStatus.APPROVED)
                .durationDays(2.0)
                .build();

        LeaveRequest reqHr = LeaveRequest.builder()
                .id("r-hr")
                .employeeId("emp-2")
                .leaveTypeCode(L_CODE.SICK)
                .status(LeaveRequestStatus.APPROVED)
                .durationDays(1.0)
                .build();

        when(leaveRequestRepository.findAll()).thenReturn(List.of(reqEng, reqHr));

        HrAnalyticsResponse res = hrAnalyticsService.getAnalytics("dept-eng");

        assertNotNull(res);
        assertEquals("dept-eng", res.getOrganizationSummary().getActiveScope());
        assertEquals("Engineering", res.getOrganizationSummary().getDepartmentLabel());
        assertEquals(1, res.getPresenceKpi().getTotalMembers());
        assertEquals(1, res.getApprovalKpi().getTotalRequests()); // Only emp-1's request
        assertEquals(1, res.getWorkforceRoster().size());
        assertEquals("emp-1", res.getWorkforceRoster().get(0).getEmployeeId());
    }

    @Test
    void testStalePendingDetectionAcrossOrganization() {
        when(departmentRepository.findAll()).thenReturn(List.of(deptEngineering, deptHr));
        when(employeeRepository.findAll()).thenReturn(List.of(empEng, empHr));

        Instant staleDate = Instant.now().minus(5, ChronoUnit.DAYS);
        Instant freshDate = Instant.now().minus(1, ChronoUnit.DAYS);

        LeaveRequest staleReq = LeaveRequest.builder()
                .id("r-stale")
                .employeeId("emp-1")
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .status(LeaveRequestStatus.PENDING)
                .submittedAt(staleDate)
                .build();

        LeaveRequest freshReq = LeaveRequest.builder()
                .id("r-fresh")
                .employeeId("emp-2")
                .leaveTypeCode(L_CODE.SICK)
                .status(LeaveRequestStatus.PENDING)
                .submittedAt(freshDate)
                .build();

        when(leaveRequestRepository.findAll()).thenReturn(List.of(staleReq, freshReq));

        HrAnalyticsResponse res = hrAnalyticsService.getAnalytics("ALL");

        assertEquals(2, res.getApprovalKpi().getPendingCount());
        assertEquals(1, res.getApprovalKpi().getStalePendingCount()); // Only r-stale
    }
}
