package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.dtos.request.CreateLeaveRequest;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeavePolicy;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.LeaveType;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.entities.embedded.EmployeeSnapshot;
import com.stagepfa.demo.domain.entities.embedded.LedgerMovement;
import com.stagepfa.demo.domain.entities.embedded.StatusHistoryEntry;
import com.stagepfa.demo.domain.enums.AccrualUnit;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.domain.enums.LedgerMovementType;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.domain.dtos.request.EligibilityCheckRequest;
import com.stagepfa.demo.domain.dtos.response.EligibilityResponse;
import com.stagepfa.demo.domain.enums.ExplanationSeverity;
import com.stagepfa.demo.domain.events.LeaveRequestEvent;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveRequestRepository;
import com.stagepfa.demo.repositories.LeaveTypeRepository;
import com.stagepfa.demo.services.CurrentUserService;
import com.stagepfa.demo.services.DurationCalculator;
import com.stagepfa.demo.services.EligibilityService;
import com.stagepfa.demo.services.LeaveLedgerService;
import com.stagepfa.demo.services.LeavePolicyService;
import com.stagepfa.demo.services.LeaveRequestService;
import com.stagepfa.demo.services.OrganizationSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
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
    private final LeaveLedgerService leaveLedgerService;
    private final LeaveTypeRepository leaveTypeRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final EligibilityService eligibilityService;
    private final DurationCalculator durationCalculator;

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
    @Transactional
    public LeaveRequest submit(String id) {
        User user = currentUserService.requireLinkedUser();
        String employeeId = user.getEmployeeId();
        if (employeeId == null || employeeId.isBlank()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Account is not linked to an employee");
        }

        LeaveRequest leaveRequest = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", id));

        if (!employeeId.equals(leaveRequest.getEmployeeId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "You are not authorized to submit this leave request");
        }

        if (leaveRequest.getStatus() != LeaveRequestStatus.DRAFT) {
            throw new BusinessException(ErrorCode.INVALID_STATUS_TRANSITION, "Only draft leave requests can be submitted");
        }

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));

        EligibilityCheckRequest checkReq = EligibilityCheckRequest.builder()
                .leaveTypeCode(leaveRequest.getLeaveTypeCode())
                .startDate(leaveRequest.getStartDate())
                .endDate(leaveRequest.getEndDate())
                .halfDayStart(leaveRequest.isHalfDayStart())
                .halfDayEnd(leaveRequest.isHalfDayEnd())
                .excludeRequestId(leaveRequest.getId())
                .build();

        EligibilityResponse eligibility = eligibilityService.check(employee, checkReq);
        if (!eligibility.isEligible()) {
            List<com.stagepfa.demo.domain.dtos.common.ErrorDetail> details = eligibility.getExplanations().stream()
                    .filter(e -> e.getSeverity() == ExplanationSeverity.BLOCKING)
                    .map(e -> com.stagepfa.demo.domain.dtos.common.ErrorDetail.builder()
                            .field(e.getCode())
                            .code(e.getCode())
                            .message(e.getBody())
                            .build())
                    .toList();

            throw new BusinessException(
                    mapEligibilityError(eligibility),
                    "Not eligible to submit: " + String.join("; ", eligibility.getReasons()),
                    details
            );
        }

        Instant now = Instant.now();
        leaveRequest.setStatus(LeaveRequestStatus.PENDING);
        leaveRequest.setSubmittedAt(now);

        if (leaveRequest.getStatusHistory() == null) {
            leaveRequest.setStatusHistory(new ArrayList<>());
        }

        StatusHistoryEntry entry = StatusHistoryEntry.builder()
                .fromStatus(LeaveRequestStatus.DRAFT)
                .toStatus(LeaveRequestStatus.PENDING)
                .at(now)
                .byUserId(user.getId())
                .comment("Submitted for approval")
                .build();
        leaveRequest.getStatusHistory().add(entry);

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);
        eventPublisher.publishEvent(new LeaveRequestEvent(saved, LeaveRequestStatus.DRAFT, LeaveRequestStatus.PENDING, user.getId(), null));
        return saved;
    }

    @Override
    @Transactional
    public LeaveRequest approve(String id, String comment) {
        User user = currentUserService.requireLinkedUser();
        String managerEmployeeId = user.getEmployeeId();
        if (managerEmployeeId == null || managerEmployeeId.isBlank()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Account is not linked to an employee");
        }

        LeaveRequest leaveRequest = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", id));

        if (leaveRequest.getStatus() != LeaveRequestStatus.PENDING) {
            throw new BusinessException(ErrorCode.INVALID_STATUS_TRANSITION, "Only pending leave requests can be approved");
        }

        if (managerEmployeeId.equals(leaveRequest.getEmployeeId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Managers cannot approve their own leave requests");
        }

        Employee requester = employeeRepository.findById(leaveRequest.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", leaveRequest.getEmployeeId()));

        if (requester.getCurrentManager() == null || !managerEmployeeId.equals(requester.getCurrentManager().getEmployeeId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "You are not the manager of this employee");
        }

        LeaveType leaveType = leaveTypeRepository.findByCode(leaveRequest.getLeaveTypeCode().name())
                .orElseThrow(() -> new ResourceNotFoundException("LeaveType", leaveRequest.getLeaveTypeCode().name()));

        if (leaveType.isDeductsFromBalance()) {
            LedgerMovement movement = LedgerMovement.builder()
                    .date(Instant.now())
                    .type(LedgerMovementType.APPROVED_LEAVE_DEBIT)
                    .amount(leaveRequest.getDurationDays())
                    .note(comment != null && !comment.isBlank() ? comment : "Leave request approved: " + leaveRequest.getId())
                    .leaveRequestId(leaveRequest.getId())
                    .actorUserId(user.getId())
                    .build();

            leaveLedgerService.appendMovement(
                    leaveRequest.getEmployeeId(),
                    leaveRequest.getLeaveTypeCode().name(),
                    leaveRequest.getStartDate().getYear(),
                    movement
            );
        }

        Instant now = Instant.now();
        leaveRequest.setStatus(LeaveRequestStatus.APPROVED);
        leaveRequest.setValidatedAt(now);
        leaveRequest.setValidatedBy(user.getId());
        leaveRequest.setValidationComment(comment);

        if (leaveRequest.getStatusHistory() == null) {
            leaveRequest.setStatusHistory(new ArrayList<>());
        }

        StatusHistoryEntry entry = StatusHistoryEntry.builder()
                .fromStatus(LeaveRequestStatus.PENDING)
                .toStatus(LeaveRequestStatus.APPROVED)
                .at(now)
                .byUserId(user.getId())
                .comment(comment != null && !comment.isBlank() ? comment : "Approved by manager")
                .build();
        leaveRequest.getStatusHistory().add(entry);

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);
        eventPublisher.publishEvent(new LeaveRequestEvent(saved, LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED, user.getId(), comment));
        return saved;
    }

    @Override
    @Transactional
    public LeaveRequest reject(String id, String comment) {
        User user = currentUserService.requireLinkedUser();
        String managerEmployeeId = user.getEmployeeId();
        if (managerEmployeeId == null || managerEmployeeId.isBlank()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Account is not linked to an employee");
        }

        if (comment == null || comment.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Comment is required when rejecting a leave request");
        }

        LeaveRequest leaveRequest = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", id));

        if (leaveRequest.getStatus() != LeaveRequestStatus.PENDING) {
            throw new BusinessException(ErrorCode.INVALID_STATUS_TRANSITION, "Only pending leave requests can be rejected");
        }

        if (managerEmployeeId.equals(leaveRequest.getEmployeeId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Managers cannot reject their own leave requests");
        }

        Employee requester = employeeRepository.findById(leaveRequest.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", leaveRequest.getEmployeeId()));

        if (requester.getCurrentManager() == null || !managerEmployeeId.equals(requester.getCurrentManager().getEmployeeId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "You are not the manager of this employee");
        }

        Instant now = Instant.now();
        leaveRequest.setStatus(LeaveRequestStatus.REJECTED);
        leaveRequest.setValidatedAt(now);
        leaveRequest.setValidatedBy(user.getId());
        leaveRequest.setValidationComment(comment);

        if (leaveRequest.getStatusHistory() == null) {
            leaveRequest.setStatusHistory(new ArrayList<>());
        }

        StatusHistoryEntry entry = StatusHistoryEntry.builder()
                .fromStatus(LeaveRequestStatus.PENDING)
                .toStatus(LeaveRequestStatus.REJECTED)
                .at(now)
                .byUserId(user.getId())
                .comment(comment)
                .build();
        leaveRequest.getStatusHistory().add(entry);

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);
        eventPublisher.publishEvent(new LeaveRequestEvent(saved, LeaveRequestStatus.PENDING, LeaveRequestStatus.REJECTED, user.getId(), comment));
        return saved;
    }

    @Override
    @Transactional
    public LeaveRequest cancel(String id, String reason) {
        User user = currentUserService.requireLinkedUser();
        String employeeId = user.getEmployeeId();
        if (employeeId == null || employeeId.isBlank()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Account is not linked to an employee");
        }

        LeaveRequest leaveRequest = leaveRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("LeaveRequest", id));

        if (!employeeId.equals(leaveRequest.getEmployeeId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "You are not authorized to cancel this leave request");
        }

        LeaveRequestStatus currentStatus = leaveRequest.getStatus();
        if (currentStatus != LeaveRequestStatus.DRAFT
                && currentStatus != LeaveRequestStatus.PENDING
                && currentStatus != LeaveRequestStatus.APPROVED) {
            throw new BusinessException(ErrorCode.INVALID_STATUS_TRANSITION,
                    "Cannot cancel a leave request with status: " + currentStatus);
        }

        if (currentStatus == LeaveRequestStatus.APPROVED) {
            LeaveType leaveType = leaveTypeRepository.findByCode(leaveRequest.getLeaveTypeCode().name())
                    .orElseThrow(() -> new ResourceNotFoundException("LeaveType", leaveRequest.getLeaveTypeCode().name()));

            if (leaveType.isDeductsFromBalance()) {
                LedgerMovement movement = LedgerMovement.builder()
                        .date(Instant.now())
                        .type(LedgerMovementType.CANCELLED_LEAVE_CREDIT)
                        .amount(leaveRequest.getDurationDays())
                        .note(reason != null && !reason.isBlank() ? reason : "Leave request cancelled: " + leaveRequest.getId())
                        .leaveRequestId(leaveRequest.getId())
                        .actorUserId(user.getId())
                        .build();

                leaveLedgerService.appendMovement(
                        leaveRequest.getEmployeeId(),
                        leaveRequest.getLeaveTypeCode().name(),
                        leaveRequest.getStartDate().getYear(),
                        movement
                );
            }
        }

        Instant now = Instant.now();
        leaveRequest.setStatus(LeaveRequestStatus.CANCELLED);

        if (leaveRequest.getStatusHistory() == null) {
            leaveRequest.setStatusHistory(new ArrayList<>());
        }

        StatusHistoryEntry entry = StatusHistoryEntry.builder()
                .fromStatus(currentStatus)
                .toStatus(LeaveRequestStatus.CANCELLED)
                .at(now)
                .byUserId(user.getId())
                .comment(reason != null && !reason.isBlank() ? reason : "Cancelled by employee")
                .build();
        leaveRequest.getStatusHistory().add(entry);

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);
        eventPublisher.publishEvent(new LeaveRequestEvent(saved, currentStatus, LeaveRequestStatus.CANCELLED, user.getId(), reason));
        return saved;
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

    @Override
    public List<LeaveRequest> listPendingTeamRequests() {
        User user = currentUserService.requireLinkedUser();
        String managerEmployeeId = user.getEmployeeId();
        if (managerEmployeeId == null || managerEmployeeId.isBlank()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Account is not linked to an employee");
        }

        List<Employee> directReports = employeeRepository.findByCurrentManagerEmployeeId(managerEmployeeId);
        if (directReports == null || directReports.isEmpty()) {
            return List.of();
        }

        List<String> reportIds = directReports.stream()
                .map(Employee::getId)
                .toList();

        return leaveRequestRepository.findByEmployeeIdInAndStatus(reportIds, LeaveRequestStatus.PENDING);
    }

    private void validateDates(LocalDate start, LocalDate end) {
        if (start == null || end == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Start date and end date are required");
        }
        if (end.isBefore(start)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "End date cannot be before start date");
        }
    }

    private ErrorCode mapEligibilityError(EligibilityResponse e) {
        if (e.getBlockingCode() != null) {
            return switch (e.getBlockingCode()) {
                case "INSUFFICIENT_BALANCE" -> ErrorCode.INSUFFICIENT_BALANCE;
                case "OVERLAP_DETECTED" -> ErrorCode.OVERLAP_DETECTED;
                default -> ErrorCode.VALIDATION_ERROR;
            };
        }
        String joined = String.join(" ", e.getReasons()).toLowerCase();
        if (joined.contains("insufficient balance")) {
            return ErrorCode.INSUFFICIENT_BALANCE;
        }
        if (joined.contains("overlap")) {
            return ErrorCode.OVERLAP_DETECTED;
        }
        return ErrorCode.VALIDATION_ERROR;
    }

    private double calculateDuration(LocalDate start, LocalDate end, boolean halfDayStart, boolean halfDayEnd, AccrualUnit accrualUnit) {
        List<Integer> weekendDays = List.of(6, 7);
        try {
            var settings = organizationSettingsService.get();
            if (settings != null && settings.getWeekendDays() != null && !settings.getWeekendDays().isEmpty()) {
                weekendDays = settings.getWeekendDays();
            }
        } catch (Exception ignored) {
            // fallback to Saturday (6) and Sunday (7)
        }
        return durationCalculator.calculate(start, end, halfDayStart, halfDayEnd, accrualUnit, weekendDays);
    }
}
