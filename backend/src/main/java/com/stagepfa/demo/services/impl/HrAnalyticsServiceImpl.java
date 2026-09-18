package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.dtos.response.HrAnalyticsResponse;
import com.stagepfa.demo.domain.entities.Department;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.enums.EmploymentStatus;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.repositories.DepartmentRepository;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveRequestRepository;
import com.stagepfa.demo.services.HrAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HrAnalyticsServiceImpl implements HrAnalyticsService {

    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final DepartmentRepository departmentRepository;

    @Override
    public HrAnalyticsResponse getAnalytics(String departmentId) {
        List<Department> allDepts = departmentRepository.findAll();
        Map<String, String> deptLabelsById = allDepts.stream()
                .collect(Collectors.toMap(Department::getId, Department::getLabel, (a, b) -> a));

        List<HrAnalyticsResponse.DepartmentOptionDto> availableDepts = allDepts.stream()
                .map(d -> new HrAnalyticsResponse.DepartmentOptionDto(d.getId(), d.getLabel()))
                .toList();

        boolean isAll = (departmentId == null || departmentId.isBlank() || "ALL".equalsIgnoreCase(departmentId));

        List<Employee> allEmployees = employeeRepository.findAll();
        List<LeaveRequest> allRequests = leaveRequestRepository.findAll();

        List<Employee> scopeEmployees;
        String activeScope;
        String scopeLabel;

        if (isAll) {
            scopeEmployees = allEmployees;
            activeScope = "ALL";
            scopeLabel = "All Departments (Company-wide)";
        } else {
            scopeEmployees = employeeRepository.findByCurrentAssignmentDepartmentId(departmentId);
            activeScope = departmentId;
            scopeLabel = deptLabelsById.getOrDefault(departmentId, "Department");
        }

        if (scopeEmployees == null) {
            scopeEmployees = List.of();
        }

        Set<String> scopeEmpIds = scopeEmployees.stream()
                .map(Employee::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<LeaveRequest> scopeRequests = isAll
                ? allRequests
                : allRequests.stream()
                        .filter(r -> scopeEmpIds.contains(r.getEmployeeId()))
                        .toList();

        LocalDate today = LocalDate.now();
        Instant staleThreshold = Instant.now().minus(3, ChronoUnit.DAYS);

        // Active leaves today in scope
        Map<String, LeaveRequest> activeLeavesToday = new HashMap<>();
        for (LeaveRequest req : scopeRequests) {
            if (req.getStatus() == LeaveRequestStatus.APPROVED
                    && req.getStartDate() != null
                    && req.getEndDate() != null
                    && !today.isBefore(req.getStartDate())
                    && !today.isAfter(req.getEndDate())) {
                activeLeavesToday.put(req.getEmployeeId(), req);
            }
        }

        // Global active leaves today for all-department cross stats
        Map<String, LeaveRequest> allActiveLeavesToday = new HashMap<>();
        for (LeaveRequest req : allRequests) {
            if (req.getStatus() == LeaveRequestStatus.APPROVED
                    && req.getStartDate() != null
                    && req.getEndDate() != null
                    && !today.isBefore(req.getStartDate())
                    && !today.isAfter(req.getEndDate())) {
                allActiveLeavesToday.put(req.getEmployeeId(), req);
            }
        }

        // Scope Presence KPI
        int totalMembers = scopeEmployees.size();
        int onLeaveCount = (int) scopeEmployees.stream()
                .filter(e -> activeLeavesToday.containsKey(e.getId()))
                .count();
        int presentTodayCount = Math.max(0, totalMembers - onLeaveCount);
        double leaveRatePct = totalMembers > 0
                ? Math.round((onLeaveCount * 100.0 / totalMembers) * 10.0) / 10.0
                : 0.0;
        String leaveRateStatus = calculateLeaveRateStatus(totalMembers, onLeaveCount, leaveRatePct);

        // Scope Approval KPIs
        int approvedCount = 0;
        int rejectedCount = 0;
        int pendingCount = 0;
        int stalePendingCount = 0;

        for (LeaveRequest req : scopeRequests) {
            if (req.getStatus() == LeaveRequestStatus.APPROVED) {
                approvedCount++;
            } else if (req.getStatus() == LeaveRequestStatus.REJECTED) {
                rejectedCount++;
            } else if (req.getStatus() == LeaveRequestStatus.PENDING) {
                pendingCount++;
                if (req.getSubmittedAt() != null && req.getSubmittedAt().isBefore(staleThreshold)) {
                    stalePendingCount++;
                }
            }
        }

        int totalDecided = approvedCount + rejectedCount;
        double approvalRatePct = totalDecided > 0
                ? Math.round((approvedCount * 100.0 / totalDecided) * 10.0) / 10.0
                : 0.0;

        // Leave stats by type (Donut Chart)
        List<HrAnalyticsResponse.LeaveTypeStatDto> leaveTypeStats = new ArrayList<>();
        // Status breakdown by type (Bar Chart)
        List<HrAnalyticsResponse.TypeStatusBreakdownDto> typeStatusBreakdowns = new ArrayList<>();

        for (L_CODE code : L_CODE.values()) {
            List<LeaveRequest> typeRequests = scopeRequests.stream()
                    .filter(r -> r.getLeaveTypeCode() == code)
                    .toList();

            int approvedForType = 0;
            int rejectedForType = 0;
            int pendingForType = 0;
            int staleForType = 0;
            double approvedDaysForType = 0.0;

            for (LeaveRequest r : typeRequests) {
                if (r.getStatus() == LeaveRequestStatus.APPROVED) {
                    approvedForType++;
                    approvedDaysForType += r.getDurationDays();
                } else if (r.getStatus() == LeaveRequestStatus.REJECTED) {
                    rejectedForType++;
                } else if (r.getStatus() == LeaveRequestStatus.PENDING) {
                    pendingForType++;
                    if (r.getSubmittedAt() != null && r.getSubmittedAt().isBefore(staleThreshold)) {
                        staleForType++;
                    }
                }
            }

            leaveTypeStats.add(HrAnalyticsResponse.LeaveTypeStatDto.builder()
                    .leaveTypeCode(code)
                    .label(formatLeaveTypeLabel(code))
                    .requestCount(approvedForType)
                    .totalDays(approvedDaysForType)
                    .build());

            typeStatusBreakdowns.add(HrAnalyticsResponse.TypeStatusBreakdownDto.builder()
                    .leaveTypeCode(code)
                    .label(formatLeaveTypeLabel(code))
                    .approvedCount(approvedForType)
                    .rejectedCount(rejectedForType)
                    .pendingCount(pendingForType)
                    .stalePendingCount(staleForType)
                    .build());
        }

        // Calendar Heatmap Data
        Map<String, String> employeeNamesById = allEmployees.stream()
                .collect(Collectors.toMap(
                        Employee::getId,
                        this::extractFullName,
                        (existing, replacement) -> existing
                ));

        Map<LocalDate, List<String>> dailyAbsences = new TreeMap<>();
        for (LeaveRequest req : scopeRequests) {
            if (req.getStatus() == LeaveRequestStatus.APPROVED
                    && req.getStartDate() != null
                    && req.getEndDate() != null) {
                String empName = employeeNamesById.getOrDefault(req.getEmployeeId(), "Team Member");
                LocalDate cur = req.getStartDate();
                while (!cur.isAfter(req.getEndDate())) {
                    dailyAbsences.computeIfAbsent(cur, k -> new ArrayList<>()).add(empName);
                    cur = cur.plusDays(1);
                }
            }
        }

        List<HrAnalyticsResponse.HeatmapDayDto> heatmapData = dailyAbsences.entrySet().stream()
                .map(entry -> HrAnalyticsResponse.HeatmapDayDto.builder()
                        .date(entry.getKey().toString())
                        .absentCount(entry.getValue().size())
                        .absentEmployeeNames(entry.getValue())
                        .build())
                .toList();

        // Cross-Department Comparison Stats
        List<HrAnalyticsResponse.DepartmentStatDto> departmentStats = new ArrayList<>();
        Map<String, List<Employee>> employeesByDept = allEmployees.stream()
                .filter(e -> e.getCurrentAssignment() != null && e.getCurrentAssignment().getDepartmentId() != null)
                .collect(Collectors.groupingBy(e -> e.getCurrentAssignment().getDepartmentId()));

        for (Department dept : allDepts) {
            List<Employee> deptEmps = employeesByDept.getOrDefault(dept.getId(), List.of());
            int deptHeadcount = deptEmps.size();
            Set<String> deptEmpIds = deptEmps.stream().map(Employee::getId).collect(Collectors.toSet());

            int deptOnLeave = (int) deptEmps.stream()
                    .filter(e -> allActiveLeavesToday.containsKey(e.getId()))
                    .count();
            int deptPresent = Math.max(0, deptHeadcount - deptOnLeave);
            double deptLeaveRate = deptHeadcount > 0
                    ? Math.round((deptOnLeave * 100.0 / deptHeadcount) * 10.0) / 10.0
                    : 0.0;

            int deptPending = 0;
            int deptStale = 0;
            for (LeaveRequest r : allRequests) {
                if (deptEmpIds.contains(r.getEmployeeId()) && r.getStatus() == LeaveRequestStatus.PENDING) {
                    deptPending++;
                    if (r.getSubmittedAt() != null && r.getSubmittedAt().isBefore(staleThreshold)) {
                        deptStale++;
                    }
                }
            }

            departmentStats.add(HrAnalyticsResponse.DepartmentStatDto.builder()
                    .departmentId(dept.getId())
                    .departmentLabel(dept.getLabel())
                    .headcount(deptHeadcount)
                    .presentCount(deptPresent)
                    .onLeaveCount(deptOnLeave)
                    .leaveRatePercentage(deptLeaveRate)
                    .pendingCount(deptPending)
                    .stalePendingCount(deptStale)
                    .build());
        }

        // Scope Workforce Roster
        List<HrAnalyticsResponse.TeamMemberRosterDto> roster = new ArrayList<>();
        for (Employee emp : scopeEmployees) {
            LeaveRequest activeLeave = activeLeavesToday.get(emp.getId());
            boolean onLeave = activeLeave != null;

            var profile = emp.getProfile();
            var assignment = emp.getCurrentAssignment();

            roster.add(HrAnalyticsResponse.TeamMemberRosterDto.builder()
                    .employeeId(emp.getId())
                    .employeeNumber(emp.getEmployeeNumber())
                    .firstName(profile != null ? profile.getFirstName() : null)
                    .lastName(profile != null ? profile.getLastName() : null)
                    .email(profile != null ? profile.getEmail() : null)
                    .departmentId(assignment != null ? assignment.getDepartmentId() : null)
                    .departmentLabel(assignment != null ? assignment.getDepartmentLabel() : null)
                    .positionLabel(assignment != null ? assignment.getPositionLabel() : null)
                    .employmentStatus(emp.getEmploymentStatus() != null ? emp.getEmploymentStatus() : EmploymentStatus.ACTIVE)
                    .presenceStatus(onLeave ? "ON_LEAVE" : "PRESENT")
                    .activeLeaveTypeCode(activeLeave != null ? activeLeave.getLeaveTypeCode() : null)
                    .activeLeaveStartDate(activeLeave != null ? activeLeave.getStartDate() : null)
                    .activeLeaveEndDate(activeLeave != null ? activeLeave.getEndDate() : null)
                    .activeLeaveDurationDays(activeLeave != null ? activeLeave.getDurationDays() : null)
                    .build());
        }

        return HrAnalyticsResponse.builder()
                .organizationSummary(HrAnalyticsResponse.OrganizationSummaryDto.builder()
                        .activeScope(activeScope)
                        .departmentLabel(scopeLabel)
                        .totalWorkforce(allEmployees.size())
                        .totalDepartments(allDepts.size())
                        .build())
                .presenceKpi(HrAnalyticsResponse.PresenceKpiDto.builder()
                        .totalMembers(totalMembers)
                        .presentTodayCount(presentTodayCount)
                        .onLeaveTodayCount(onLeaveCount)
                        .leaveRatePercentage(leaveRatePct)
                        .leaveRateStatus(leaveRateStatus)
                        .build())
                .approvalKpi(HrAnalyticsResponse.ApprovalKpiDto.builder()
                        .totalRequests(scopeRequests.size())
                        .approvedCount(approvedCount)
                        .rejectedCount(rejectedCount)
                        .approvalRatePercentage(approvalRatePct)
                        .pendingCount(pendingCount)
                        .stalePendingCount(stalePendingCount)
                        .build())
                .availableDepartments(availableDepts)
                .departmentStats(departmentStats)
                .workforceRoster(roster)
                .leaveTypeStats(leaveTypeStats)
                .typeStatusBreakdowns(typeStatusBreakdowns)
                .heatmapData(heatmapData)
                .build();
    }

    private String calculateLeaveRateStatus(int totalMembers, int onLeaveCount, double leaveRatePct) {
        if (totalMembers == 0 || onLeaveCount == 0) {
            return "ALL_PRESENT";
        }
        if (leaveRatePct <= 15.0) {
            return "LOW";
        }
        if (leaveRatePct <= 30.0) {
            return "MODERATE";
        }
        if (leaveRatePct <= 50.0) {
            return "HIGH";
        }
        return "VERY_HIGH";
    }

    private String extractFullName(Employee emp) {
        if (emp == null) return "Unknown";
        if (emp.getProfile() != null) {
            String first = emp.getProfile().getFirstName() != null ? emp.getProfile().getFirstName() : "";
            String last = emp.getProfile().getLastName() != null ? emp.getProfile().getLastName() : "";
            String full = (first + " " + last).trim();
            if (!full.isBlank()) return full;
        }
        return emp.getEmployeeNumber() != null ? emp.getEmployeeNumber() : emp.getId();
    }

    private String formatLeaveTypeLabel(L_CODE code) {
        if (code == null) return "";
        return switch (code) {
            case PAID_ANNUAL -> "Paid Annual";
            case SICK -> "Sick Leave";
            case UNPAID -> "Unpaid Leave";
            case MATERNITY -> "Maternity";
        };
    }
}
