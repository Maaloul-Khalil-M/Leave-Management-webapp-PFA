package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.dtos.request.CreateLeaveRequest;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.entities.embedded.EmployeeSnapshot;
import com.stagepfa.demo.domain.entities.embedded.StatusHistoryEntry;
import com.stagepfa.demo.domain.entities.LeavePolicy;
import com.stagepfa.demo.domain.enums.AccrualUnit;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveRequestRepository;
import com.stagepfa.demo.services.CurrentUserService;
import com.stagepfa.demo.services.LeavePolicyService;
import com.stagepfa.demo.services.LeaveRequestService;
import com.stagepfa.demo.services.OrganizationSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaveRequestServiceImpl implements LeaveRequestService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final CurrentUserService currentUserService;
    private final OrganizationSettingsService organizationSettingsService;
    private final LeavePolicyService leavePolicyService;

    @Override
    @Transactional
    public LeaveRequest createDraft(CreateLeaveRequest request) {
        User user = currentUserService.requireLinkedUser();
        String employeeId = user.getEmployeeId();
        if (employeeId == null || employeeId.isBlank()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Account is not linked to an employee");
        }

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));

        validateDates(request.getStartDate(), request.getEndDate());

        CountryCode country = null;
        if (employee.getCurrentAssignment() != null && employee.getCurrentAssignment().getCountryCode() != null) {
            country = employee.getCurrentAssignment().getCountryCode();
        } else {
            try {
                var settings = organizationSettingsService.get();
                if (settings != null) {
                    country = settings.getCountry();
                }
            } catch (Exception ignored) {
            }
        }

        LeavePolicy policy = null;
        if (country != null) {
            policy = leavePolicyService.resolve(country, request.getLeaveTypeCode());
        }
        AccrualUnit accrualUnit = (policy != null && policy.getAccrualUnit() != null)
                ? policy.getAccrualUnit()
                : AccrualUnit.WORKING_DAY;

        double durationDays = calculateDuration(
                request.getStartDate(),
                request.getEndDate(),
                request.isHalfDayStart(),
                request.isHalfDayEnd(),
                accrualUnit
        );

        var profile = employee.getProfile();
        var assignment = employee.getCurrentAssignment();
        EmployeeSnapshot snapshot = EmployeeSnapshot.builder()
                .employeeId(employee.getId())
                .employeeNumber(employee.getEmployeeNumber())
                .firstName(profile != null ? profile.getFirstName() : null)
                .lastName(profile != null ? profile.getLastName() : null)
                .email(profile != null ? profile.getEmail() : null)
                .departmentLabel(assignment != null ? assignment.getDepartmentLabel() : null)
                .positionLabel(assignment != null ? assignment.getPositionLabel() : null)
                .build();

        StatusHistoryEntry initialHistory = StatusHistoryEntry.builder()
                .fromStatus(null)
                .toStatus(LeaveRequestStatus.DRAFT)
                .at(Instant.now())
                .byUserId(user.getId())
                .comment("Draft created")
                .build();

        LeaveRequest leaveRequest = LeaveRequest.builder()
                .employeeId(employee.getId())
                .leaveTypeCode(request.getLeaveTypeCode())
                .employeeSnapshot(snapshot)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .halfDayStart(request.isHalfDayStart())
                .halfDayEnd(request.isHalfDayEnd())
                .durationDays(durationDays)
                .status(LeaveRequestStatus.DRAFT)
                .statusHistory(new ArrayList<>(List.of(initialHistory)))
                .reason(request.getReason())
                .supportingDocuments(new ArrayList<>())
                .build();

        return leaveRequestRepository.save(leaveRequest);
    }

    @Override
    public List<LeaveRequest> listMine() {
        User user = currentUserService.requireLinkedUser();
        String employeeId = user.getEmployeeId();
        if (employeeId == null || employeeId.isBlank()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Account is not linked to an employee");
        }

        return leaveRequestRepository.findByEmployeeId(employeeId);
    }

    private void validateDates(LocalDate start, LocalDate end) {
        if (start == null || end == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Start date and end date are required");
        }
        if (end.isBefore(start)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "End date cannot be before start date");
        }
    }

    private double calculateDuration(LocalDate start, LocalDate end, boolean halfDayStart, boolean halfDayEnd, AccrualUnit accrualUnit) {
        if (accrualUnit == AccrualUnit.CALENDAR_DAY) {
            long totalDays = ChronoUnit.DAYS.between(start, end) + 1;
            double days = (double) totalDays;
            if (halfDayStart) {
                days -= 0.5;
            }
            if (halfDayEnd) {
                days -= 0.5;
            }
            return Math.max(0.0, days);
        }

        // WORKING_DAY
        List<Integer> weekendDays = List.of(6, 7);
        try {
            var settings = organizationSettingsService.get();
            if (settings != null && settings.getWeekendDays() != null && !settings.getWeekendDays().isEmpty()) {
                weekendDays = settings.getWeekendDays();
            }
        } catch (Exception ignored) {
            // fallback to Saturday (6) and Sunday (7)
        }

        double workingDays = 0.0;
        LocalDate current = start;
        while (!current.isAfter(end)) {
            int dayOfWeek = current.getDayOfWeek().getValue();
            if (!weekendDays.contains(dayOfWeek)) {
                workingDays += 1.0;
            }
            current = current.plusDays(1);
        }

        if (workingDays > 0) {
            if (halfDayStart && !weekendDays.contains(start.getDayOfWeek().getValue())) {
                workingDays -= 0.5;
            }
            if (halfDayEnd && !weekendDays.contains(end.getDayOfWeek().getValue())) {
                workingDays -= 0.5;
            }
        }

        return Math.max(0.0, workingDays);
    }
}
