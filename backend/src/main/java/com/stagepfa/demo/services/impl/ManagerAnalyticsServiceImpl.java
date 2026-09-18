package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.dtos.response.ManagerAnalyticsResponse;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.enums.EmploymentStatus;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveRequestRepository;
import com.stagepfa.demo.services.CurrentUserService;
import com.stagepfa.demo.services.ManagerAnalyticsService;
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
public class ManagerAnalyticsServiceImpl implements ManagerAnalyticsService {

    private final EmployeeRepository employeeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final CurrentUserService currentUserService;

    @Override
    public ManagerAnalyticsResponse getAnalytics(String scope) {
        User user = currentUserService.requireLinkedUser();
        String managerEmployeeId = user.getEmployeeId();
        if (managerEmployeeId == null || managerEmployeeId.isBlank()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Account is not linked to an employee");
        }

        Employee manager = employeeRepository.findById(managerEmployeeId).orElse(null);
        String managerName = extractFullName(manager);
        String deptId = (manager != null && manager.getCurrentAssignment() != null)
                ? manager.getCurrentAssignment().getDepartmentId()
                : null;
        String deptLabel = (manager != null && manager.getCurrentAssignment() != null)
                ? manager.getCurrentAssignment().getDepartmentLabel()
                : null;

        // Resolve scope and members
        String activeScope = "team";
        List<Employee> members = List.of();

        if ("department".equalsIgnoreCase(scope) && deptId != null) {
            members = employeeRepository.findByCurrentAssignmentDepartmentId(deptId);
            activeScope = "department";
        } else {
            members = employeeRepository.findByCurrentManagerEmployeeId(managerEmployeeId);
            if (members.isEmpty() && deptId != null) {
                // Fallback to department if manager has no direct reports
                members = employeeRepository.findByCurrentAssignmentDepartmentId(deptId);
                activeScope = "department";
            }
        }

        if (members == null) {
            members = List.of();
        }

        List<String> memberIds = members.stream()
                .map(Employee::getId)
                .filter(Objects::nonNull)
                .toList();

        List<LeaveRequest> requests = memberIds.isEmpty()
                ? List.of()
                : leaveRequestRepository.findByEmployeeIdIn(memberIds);

        LocalDate today = LocalDate.now();
        Instant staleThreshold = Instant.now().minus(3, ChronoUnit.DAYS);

        // Find approved leaves active today
        Map<String, LeaveRequest> activeLeavesTodayByEmpId = new HashMap<>();
        for (LeaveRequest req : requests) {
            if (req.getStatus() == LeaveRequestStatus.APPROVED
                    && req.getStartDate() != null
                    && req.getEndDate() != null
                    && !today.isBefore(req.getStartDate())
                    && !today.isAfter(req.getEndDate())) {
                activeLeavesTodayByEmpId.put(req.getEmployeeId(), req);
            }
        }

        // Build roster
        List<ManagerAnalyticsResponse.TeamMemberRosterDto> roster = new ArrayList<>();
        int onLeaveCount = 0;

        for (Employee emp : members) {
            LeaveRequest activeLeave = activeLeavesTodayByEmpId.get(emp.getId());
            boolean onLeave = activeLeave != null;
            if (onLeave) {
                onLeaveCount++;
            }

            var profile = emp.getProfile();
            var assignment = emp.getCurrentAssignment();

            roster.add(ManagerAnalyticsResponse.TeamMemberRosterDto.builder()
                    .employeeId(emp.getId())
                    .employeeNumber(emp.getEmployeeNumber())
                    .firstName(profile != null ? profile.getFirstName() : null)
                    .lastName(profile != null ? profile.getLastName() : null)
                    .email(profile != null ? profile.getEmail() : null)
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

        int totalMembers = members.size();
        int presentTodayCount = Math.max(0, totalMembers - onLeaveCount);
        double leaveRatePct = totalMembers > 0
                ? Math.round((onLeaveCount * 100.0 / totalMembers) * 10.0) / 10.0
                : 0.0;

        String leaveRateStatus = calculateLeaveRateStatus(totalMembers, onLeaveCount, leaveRatePct);

        // Approval KPIs
        int approvedCount = 0;
        int rejectedCount = 0;
        int pendingCount = 0;
        int stalePendingCount = 0;

        for (LeaveRequest req : requests) {
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

        // Leave stats by type (for doughnut chart)
        List<ManagerAnalyticsResponse.LeaveTypeStatDto> leaveTypeStats = new ArrayList<>();
        // Status breakdown by type (for bar chart)
        List<ManagerAnalyticsResponse.TypeStatusBreakdownDto> typeStatusBreakdowns = new ArrayList<>();

        for (L_CODE code : L_CODE.values()) {
            List<LeaveRequest> typeRequests = requests.stream()
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

            leaveTypeStats.add(ManagerAnalyticsResponse.LeaveTypeStatDto.builder()
                    .leaveTypeCode(code)
                    .label(formatLeaveTypeLabel(code))
                    .requestCount(approvedForType)
                    .totalDays(approvedDaysForType)
                    .build());

            typeStatusBreakdowns.add(ManagerAnalyticsResponse.TypeStatusBreakdownDto.builder()
                    .leaveTypeCode(code)
                    .label(formatLeaveTypeLabel(code))
                    .approvedCount(approvedForType)
                    .rejectedCount(rejectedForType)
                    .pendingCount(pendingForType)
                    .stalePendingCount(staleForType)
                    .build());
        }

        // Calendar Heatmap Data (Understaffing evaluation)
        Map<String, String> employeeNamesById = members.stream()
                .collect(Collectors.toMap(
                        Employee::getId,
                        this::extractFullName,
                        (existing, replacement) -> existing
                ));

        Map<LocalDate, List<String>> dailyAbsences = new TreeMap<>();
        for (LeaveRequest req : requests) {
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

        List<ManagerAnalyticsResponse.HeatmapDayDto> heatmapData = dailyAbsences.entrySet().stream()
                .map(entry -> ManagerAnalyticsResponse.HeatmapDayDto.builder()
                        .date(entry.getKey().toString())
                        .absentCount(entry.getValue().size())
                        .absentEmployeeNames(entry.getValue())
                        .build())
                .toList();

        return ManagerAnalyticsResponse.builder()
                .teamSummary(ManagerAnalyticsResponse.TeamSummaryDto.builder()
                        .managerEmployeeId(managerEmployeeId)
                        .managerName(managerName)
                        .departmentId(deptId)
                        .departmentLabel(deptLabel)
                        .totalMembers(totalMembers)
                        .activeScope(activeScope)
                        .build())
                .presenceKpi(ManagerAnalyticsResponse.PresenceKpiDto.builder()
                        .totalMembers(totalMembers)
                        .presentTodayCount(presentTodayCount)
                        .onLeaveTodayCount(onLeaveCount)
                        .leaveRatePercentage(leaveRatePct)
                        .leaveRateStatus(leaveRateStatus)
                        .build())
                .approvalKpi(ManagerAnalyticsResponse.ApprovalKpiDto.builder()
                        .totalRequests(requests.size())
                        .approvedCount(approvedCount)
                        .rejectedCount(rejectedCount)
                        .approvalRatePercentage(approvalRatePct)
                        .pendingCount(pendingCount)
                        .stalePendingCount(stalePendingCount)
                        .build())
                .teamRoster(roster)
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
