package com.stagepfa.demo.domain.dtos.response;

import com.stagepfa.demo.domain.enums.EmploymentStatus;
import com.stagepfa.demo.domain.enums.L_CODE;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManagerAnalyticsResponse {

    private TeamSummaryDto teamSummary;
    private PresenceKpiDto presenceKpi;
    private ApprovalKpiDto approvalKpi;

    @Builder.Default
    private List<TeamMemberRosterDto> teamRoster = new ArrayList<>();

    @Builder.Default
    private List<LeaveTypeStatDto> leaveTypeStats = new ArrayList<>();

    @Builder.Default
    private List<TypeStatusBreakdownDto> typeStatusBreakdowns = new ArrayList<>();

    @Builder.Default
    private List<HeatmapDayDto> heatmapData = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamSummaryDto {
        private String managerEmployeeId;
        private String managerName;
        private String departmentId;
        private String departmentLabel;
        private int totalMembers;
        private String activeScope; // "team" or "department"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PresenceKpiDto {
        private int totalMembers;
        private int presentTodayCount;
        private int onLeaveTodayCount;
        private double leaveRatePercentage;
        private String leaveRateStatus; // "ALL_PRESENT", "LOW", "MODERATE", "HIGH", "VERY_HIGH"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApprovalKpiDto {
        private int totalRequests;
        private int approvedCount;
        private int rejectedCount;
        private double approvalRatePercentage;
        private int pendingCount;
        private int stalePendingCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamMemberRosterDto {
        private String employeeId;
        private String employeeNumber;
        private String firstName;
        private String lastName;
        private String email;
        private String departmentLabel;
        private String positionLabel;
        private EmploymentStatus employmentStatus;
        private String presenceStatus; // "PRESENT" or "ON_LEAVE"
        private L_CODE activeLeaveTypeCode;
        private LocalDate activeLeaveStartDate;
        private LocalDate activeLeaveEndDate;
        private Double activeLeaveDurationDays;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveTypeStatDto {
        private L_CODE leaveTypeCode;
        private String label;
        private int requestCount;
        private double totalDays;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TypeStatusBreakdownDto {
        private L_CODE leaveTypeCode;
        private String label;
        private int approvedCount;
        private int rejectedCount;
        private int pendingCount;
        private int stalePendingCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HeatmapDayDto {
        private String date; // "yyyy-MM-dd"
        private int absentCount;
        @Builder.Default
        private List<String> absentEmployeeNames = new ArrayList<>();
    }
}
