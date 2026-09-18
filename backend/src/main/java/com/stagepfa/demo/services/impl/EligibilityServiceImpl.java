package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.dtos.request.EligibilityCheckRequest;
import com.stagepfa.demo.domain.dtos.response.EligibilityResponse;
import com.stagepfa.demo.domain.dtos.response.Explanation;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeaveLedger;
import com.stagepfa.demo.domain.entities.LeavePolicy;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.LeaveType;
import com.stagepfa.demo.domain.entities.OrganizationSettings;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.enums.AccrualUnit;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.domain.enums.EmploymentStatus;
import com.stagepfa.demo.domain.enums.ExplanationSeverity;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveRequestRepository;
import com.stagepfa.demo.repositories.LeaveTypeRepository;
import com.stagepfa.demo.services.CurrentUserService;
import com.stagepfa.demo.services.DurationCalculator;
import com.stagepfa.demo.services.EligibilityService;
import com.stagepfa.demo.services.ExplanationFactory;
import com.stagepfa.demo.services.LeaveLedgerService;
import com.stagepfa.demo.services.LeavePolicyService;
import com.stagepfa.demo.services.OrganizationSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EligibilityServiceImpl implements EligibilityService {

    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveLedgerService leaveLedgerService;
    private final LeavePolicyService leavePolicyService;
    private final OrganizationSettingsService organizationSettingsService;
    private final DurationCalculator durationCalculator;
    private final ExplanationFactory explanationFactory;
    private final CurrentUserService currentUserService;

    @Override
    public EligibilityResponse check(Employee employee, EligibilityCheckRequest request) {
        List<String> reasons = new ArrayList<>();
        List<Explanation> explanations = new ArrayList<>();
        Double availableBalance = null;
        double durationDays = 0;

        if (employee.getEmploymentStatus() != EmploymentStatus.ACTIVE) {
            String status = employee.getEmploymentStatus() != null ? employee.getEmploymentStatus().name() : "UNKNOWN";
            reasons.add("Employee is not ACTIVE (status=" + status + ")");
            explanations.add(explanationFactory.employeeNotActive(status));
        }

        String leaveCodeStr = request.getLeaveTypeCode() != null ? request.getLeaveTypeCode().name() : "";
        LeaveType leaveType = leaveTypeRepository.findByCode(leaveCodeStr)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveType", leaveCodeStr));

        if (!leaveType.isActive()) {
            reasons.add("Leave type is not active: " + leaveCodeStr);
            explanations.add(explanationFactory.leaveTypeInactive(leaveCodeStr));
        }

        if (request.getEndDate() != null && request.getStartDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            reasons.add("endDate must be on or after startDate");
            explanations.add(explanationFactory.invalidDateRange());
        }

        CountryCode country = null;
        if (employee.getCurrentAssignment() != null && employee.getCurrentAssignment().getCountryCode() != null) {
            country = employee.getCurrentAssignment().getCountryCode();
        } else {
            try {
                OrganizationSettings settings = organizationSettingsService.get();
                if (settings != null) {
                    country = settings.getCountry();
                }
            } catch (Exception ignored) {
            }
        }

        LeavePolicy policy = null;
        if (country != null && request.getLeaveTypeCode() != null) {
            policy = leavePolicyService.resolve(country, request.getLeaveTypeCode());
        }

        AccrualUnit unit = (policy != null && policy.getAccrualUnit() != null)
                ? policy.getAccrualUnit()
                : AccrualUnit.WORKING_DAY;

        List<Integer> weekendDays = List.of(6, 7);
        try {
            OrganizationSettings settings = organizationSettingsService.get();
            if (settings != null && settings.getWeekendDays() != null && !settings.getWeekendDays().isEmpty()) {
                weekendDays = settings.getWeekendDays();
            }
        } catch (Exception ignored) {
        }

        if (request.getStartDate() != null && request.getEndDate() != null && !request.getEndDate().isBefore(request.getStartDate())) {
            durationDays = durationCalculator.calculate(
                    request.getStartDate(),
                    request.getEndDate(),
                    request.isHalfDayStart(),
                    request.isHalfDayEnd(),
                    unit,
                    weekendDays
            );
            explanations.add(explanationFactory.durationInfo(durationDays, unit.name()));
        }

        if (policy != null && policy.getMinBlockDays() != null) {
            double minBlock = policy.getMinBlockDays();
            if (durationDays + 1e-9 < minBlock) {
                reasons.add("Duration " + durationDays + " is below minimum block of " + minBlock + " days");
                explanations.add(explanationFactory.minBlockDays(minBlock, durationDays));
            }
        }

        // Soft notice-period warning (does not block eligibility by itself)
        if (policy != null && policy.getNoticeDays() != null && request.getStartDate() != null) {
            int noticeDays = policy.getNoticeDays();
            long daysUntilStart = ChronoUnit.DAYS.between(LocalDate.now(), request.getStartDate());
            if (daysUntilStart >= 0 && daysUntilStart < noticeDays) {
                explanations.add(explanationFactory.shortNotice(noticeDays, daysUntilStart));
            }
        }

        if (request.getStartDate() != null && request.getEndDate() != null) {
            List<LeaveRequest> overlaps = leaveRequestRepository
                    .findByEmployeeIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                            employee.getId(),
                            LeaveRequestStatus.APPROVED,
                            request.getEndDate(),
                            request.getStartDate());

            if (request.getExcludeRequestId() != null) {
                overlaps = overlaps.stream()
                        .filter(r -> !r.getId().equals(request.getExcludeRequestId()))
                        .toList();
            }

            if (!overlaps.isEmpty()) {
                List<String> ids = overlaps.stream().map(LeaveRequest::getId).toList();
                reasons.add("Overlaps with approved leave request(s): " + ids);
                explanations.add(explanationFactory.overlapApproved(ids));
            }
        }

        if (leaveType.isDeductsFromBalance() && request.getStartDate() != null) {
            int year = request.getStartDate().getYear();
            LeaveLedger ledger = leaveLedgerService.getOrCreate(
                    employee.getId(), leaveCodeStr, year);
            availableBalance = ledger.getAvailableBalance();
            if (availableBalance + 1e-9 < durationDays) {
                reasons.add("Insufficient balance: available=" + availableBalance
                        + ", required=" + durationDays);
                explanations.add(explanationFactory.insufficientBalance(availableBalance, durationDays));
            } else {
                explanations.add(explanationFactory.balanceOk(availableBalance, durationDays));
            }
        } else {
            explanations.add(explanationFactory.balanceUnaffected(leaveCodeStr));
        }

        if (leaveType.isRequiresProof()) {
            explanations.add(explanationFactory.proofRequired(leaveCodeStr));
        }

        String blockingCode = explanations.stream()
                .filter(e -> e.getSeverity() == ExplanationSeverity.BLOCKING)
                .map(Explanation::getCode)
                .findFirst()
                .orElse(null);

        boolean eligible = explanations.stream()
                .noneMatch(e -> e.getSeverity() == ExplanationSeverity.BLOCKING);

        return EligibilityResponse.builder()
                .eligible(eligible)
                .durationDays(durationDays)
                .availableBalance(availableBalance)
                .blockingCode(blockingCode)
                .reasons(reasons)
                .explanations(explanations)
                .build();
    }

    @Override
    public EligibilityResponse checkCurrentUser(EligibilityCheckRequest request) {
        User user = currentUserService.requireLinkedUser();
        String employeeId = user.getEmployeeId();
        if (employeeId == null || employeeId.isBlank()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Account is not linked to an employee");
        }

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));

        return check(employee, request);
    }
}
