package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.request.EligibilityCheckRequest;
import com.stagepfa.demo.domain.dtos.response.EligibilityResponse;
import com.stagepfa.demo.domain.dtos.response.Explanation;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeaveLedger;
import com.stagepfa.demo.domain.entities.LeavePolicy;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.LeaveType;
import com.stagepfa.demo.domain.entities.OrganizationSettings;
import com.stagepfa.demo.domain.entities.embedded.Assignment;
import com.stagepfa.demo.domain.enums.AccrualUnit;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.domain.enums.EmploymentStatus;
import com.stagepfa.demo.domain.enums.ExplanationSeverity;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveRequestRepository;
import com.stagepfa.demo.repositories.LeaveTypeRepository;
import com.stagepfa.demo.services.impl.EligibilityServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EligibilityServiceTest {

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private LeaveLedgerService leaveLedgerService;

    @Mock
    private LeavePolicyService leavePolicyService;

    @Mock
    private OrganizationSettingsService organizationSettingsService;

    @Mock
    private CurrentUserService currentUserService;

    @Spy
    private DurationCalculator durationCalculator = new DurationCalculator();

    @Spy
    private ExplanationFactory explanationFactory = new ExplanationFactory();

    @InjectMocks
    private EligibilityServiceImpl eligibilityService;

    private Employee activeEmployee;
    private LeaveType paidAnnualType;
    private LeavePolicy policy;

    @BeforeEach
    void setUp() {
        activeEmployee = Employee.builder()
                .id("emp-1")
                .employmentStatus(EmploymentStatus.ACTIVE)
                .currentAssignment(Assignment.builder()
                        .countryCode(CountryCode.TN)
                        .build())
                .build();

        paidAnnualType = LeaveType.builder()
                .code(L_CODE.PAID_ANNUAL)
                .isActive(true)
                .deductsFromBalance(true)
                .requiresProof(false)
                .build();

        policy = LeavePolicy.builder()
                .country(CountryCode.TN)
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .accrualUnit(AccrualUnit.WORKING_DAY)
                .build();
    }

    @Test
    void testEligibleWhenBalanceIsSufficient() {
        LocalDate start = LocalDate.now().plusDays(10);
        LocalDate end = start.plusDays(4); // 5 days (assuming weekdays)

        when(leaveTypeRepository.findByCode("PAID_ANNUAL")).thenReturn(Optional.of(paidAnnualType));
        when(leavePolicyService.resolve(CountryCode.TN, L_CODE.PAID_ANNUAL)).thenReturn(policy);
        when(leaveRequestRepository.findByEmployeeIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                eq("emp-1"), eq(LeaveRequestStatus.APPROVED), any(), any()))
                .thenReturn(List.of());

        LeaveLedger ledger = LeaveLedger.builder()
                .availableBalance(15.0)
                .build();
        when(leaveLedgerService.getOrCreate(eq("emp-1"), eq("PAID_ANNUAL"), anyInt())).thenReturn(ledger);

        EligibilityCheckRequest req = EligibilityCheckRequest.builder()
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(start)
                .endDate(end)
                .build();

        EligibilityResponse response = eligibilityService.check(activeEmployee, req);

        assertTrue(response.isEligible());
        assertNull(response.getBlockingCode());
        assertEquals(15.0, response.getAvailableBalance());
        assertTrue(response.getExplanations().stream().anyMatch(e -> "BALANCE_OK".equals(e.getCode())));
        assertTrue(response.getExplanations().stream().anyMatch(e -> "DURATION_COMPUTED".equals(e.getCode())));
    }

    @Test
    void testIneligibleWhenInsufficientBalance() {
        LocalDate start = LocalDate.now().plusDays(10);
        LocalDate end = start.plusDays(4);

        when(leaveTypeRepository.findByCode("PAID_ANNUAL")).thenReturn(Optional.of(paidAnnualType));
        when(leavePolicyService.resolve(CountryCode.TN, L_CODE.PAID_ANNUAL)).thenReturn(policy);
        when(leaveRequestRepository.findByEmployeeIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any(), any(), any())).thenReturn(List.of());

        LeaveLedger ledger = LeaveLedger.builder()
                .availableBalance(2.0)
                .build();
        when(leaveLedgerService.getOrCreate(eq("emp-1"), eq("PAID_ANNUAL"), anyInt())).thenReturn(ledger);

        EligibilityCheckRequest req = EligibilityCheckRequest.builder()
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(start)
                .endDate(end)
                .build();

        EligibilityResponse response = eligibilityService.check(activeEmployee, req);

        assertFalse(response.isEligible());
        assertEquals("INSUFFICIENT_BALANCE", response.getBlockingCode());
        assertEquals(2.0, response.getAvailableBalance());
        assertTrue(response.getExplanations().stream()
                .anyMatch(e -> "INSUFFICIENT_BALANCE".equals(e.getCode()) && e.getSeverity() == ExplanationSeverity.BLOCKING));
    }

    @Test
    void testIneligibleWhenOverlapWithApprovedLeave() {
        LocalDate start = LocalDate.now().plusDays(10);
        LocalDate end = start.plusDays(4);

        when(leaveTypeRepository.findByCode("PAID_ANNUAL")).thenReturn(Optional.of(paidAnnualType));
        when(leavePolicyService.resolve(CountryCode.TN, L_CODE.PAID_ANNUAL)).thenReturn(policy);

        LeaveRequest overlapping = LeaveRequest.builder()
                .id("req-approved-1")
                .employeeId("emp-1")
                .status(LeaveRequestStatus.APPROVED)
                .build();

        when(leaveRequestRepository.findByEmployeeIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                eq("emp-1"), eq(LeaveRequestStatus.APPROVED), eq(end), eq(start)))
                .thenReturn(List.of(overlapping));

        LeaveLedger ledger = LeaveLedger.builder().availableBalance(20.0).build();
        when(leaveLedgerService.getOrCreate(any(), any(), anyInt())).thenReturn(ledger);

        EligibilityCheckRequest req = EligibilityCheckRequest.builder()
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(start)
                .endDate(end)
                .build();

        EligibilityResponse response = eligibilityService.check(activeEmployee, req);

        assertFalse(response.isEligible());
        assertEquals("OVERLAP_DETECTED", response.getBlockingCode());
        assertTrue(response.getExplanations().stream()
                .anyMatch(e -> "OVERLAP_DETECTED".equals(e.getCode()) && e.getSeverity() == ExplanationSeverity.BLOCKING));
    }

    @Test
    void testExcludeRequestIdIgnoresSelfInOverlap() {
        LocalDate start = LocalDate.now().plusDays(10);
        LocalDate end = start.plusDays(4);

        when(leaveTypeRepository.findByCode("PAID_ANNUAL")).thenReturn(Optional.of(paidAnnualType));
        when(leavePolicyService.resolve(CountryCode.TN, L_CODE.PAID_ANNUAL)).thenReturn(policy);

        LeaveRequest selfRequest = LeaveRequest.builder()
                .id("req-self")
                .employeeId("emp-1")
                .status(LeaveRequestStatus.APPROVED)
                .build();

        when(leaveRequestRepository.findByEmployeeIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                eq("emp-1"), eq(LeaveRequestStatus.APPROVED), eq(end), eq(start)))
                .thenReturn(List.of(selfRequest));

        LeaveLedger ledger = LeaveLedger.builder().availableBalance(20.0).build();
        when(leaveLedgerService.getOrCreate(any(), any(), anyInt())).thenReturn(ledger);

        EligibilityCheckRequest req = EligibilityCheckRequest.builder()
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(start)
                .endDate(end)
                .excludeRequestId("req-self")
                .build();

        EligibilityResponse response = eligibilityService.check(activeEmployee, req);

        assertTrue(response.isEligible());
        assertNull(response.getBlockingCode());
    }

    @Test
    void testMinBlockDaysEnforced() {
        LocalDate start = LocalDate.of(2026, 10, 5); // Monday
        LocalDate end = LocalDate.of(2026, 10, 6);   // Tuesday (2 days)

        policy.setMinBlockDays(6.0);

        when(leaveTypeRepository.findByCode("PAID_ANNUAL")).thenReturn(Optional.of(paidAnnualType));
        when(leavePolicyService.resolve(CountryCode.TN, L_CODE.PAID_ANNUAL)).thenReturn(policy);
        when(leaveRequestRepository.findByEmployeeIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any(), any(), any())).thenReturn(List.of());

        LeaveLedger ledger = LeaveLedger.builder().availableBalance(20.0).build();
        when(leaveLedgerService.getOrCreate(any(), any(), anyInt())).thenReturn(ledger);

        EligibilityCheckRequest req = EligibilityCheckRequest.builder()
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(start)
                .endDate(end)
                .build();

        EligibilityResponse response = eligibilityService.check(activeEmployee, req);

        assertFalse(response.isEligible());
        assertEquals("MIN_BLOCK_DAYS", response.getBlockingCode());
        assertTrue(response.getExplanations().stream()
                .anyMatch(e -> "MIN_BLOCK_DAYS".equals(e.getCode()) && e.getSeverity() == ExplanationSeverity.BLOCKING));
    }

    @Test
    void testShortNoticeIsWarningNotBlocking() {
        LocalDate start = LocalDate.now().plusDays(1); // 1 day notice
        LocalDate end = start;

        policy.setNoticeDays(3);

        when(leaveTypeRepository.findByCode("PAID_ANNUAL")).thenReturn(Optional.of(paidAnnualType));
        when(leavePolicyService.resolve(CountryCode.TN, L_CODE.PAID_ANNUAL)).thenReturn(policy);
        when(leaveRequestRepository.findByEmployeeIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any(), any(), any())).thenReturn(List.of());

        LeaveLedger ledger = LeaveLedger.builder().availableBalance(20.0).build();
        when(leaveLedgerService.getOrCreate(any(), any(), anyInt())).thenReturn(ledger);

        EligibilityCheckRequest req = EligibilityCheckRequest.builder()
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(start)
                .endDate(end)
                .build();

        EligibilityResponse response = eligibilityService.check(activeEmployee, req);

        assertTrue(response.isEligible());
        assertNull(response.getBlockingCode());
        assertTrue(response.getExplanations().stream()
                .anyMatch(e -> "SHORT_NOTICE".equals(e.getCode()) && e.getSeverity() == ExplanationSeverity.WARNING));
    }

    @Test
    void testNonDeductibleLeaveUnaffectedBalance() {
        LeaveType sickType = LeaveType.builder()
                .code(L_CODE.SICK)
                .isActive(true)
                .deductsFromBalance(false)
                .requiresProof(true)
                .build();

        LocalDate start = LocalDate.now().plusDays(10);
        LocalDate end = start.plusDays(2);

        when(leaveTypeRepository.findByCode("SICK")).thenReturn(Optional.of(sickType));
        when(leaveRequestRepository.findByEmployeeIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any(), any(), any())).thenReturn(List.of());

        EligibilityCheckRequest req = EligibilityCheckRequest.builder()
                .leaveTypeCode(L_CODE.SICK)
                .startDate(start)
                .endDate(end)
                .build();

        EligibilityResponse response = eligibilityService.check(activeEmployee, req);

        assertTrue(response.isEligible());
        assertNull(response.getAvailableBalance());
        assertTrue(response.getExplanations().stream()
                .anyMatch(e -> "BALANCE_UNAFFECTED".equals(e.getCode()) && e.getSeverity() == ExplanationSeverity.INFO));
        assertTrue(response.getExplanations().stream()
                .anyMatch(e -> "PROOF_REQUIRED".equals(e.getCode()) && e.getSeverity() == ExplanationSeverity.WARNING));
    }

    @Test
    void testEmployeeNotActiveBlocks() {
        Employee terminated = Employee.builder()
                .id("emp-term")
                .employmentStatus(EmploymentStatus.TERMINATED)
                .build();

        when(leaveTypeRepository.findByCode("PAID_ANNUAL")).thenReturn(Optional.of(paidAnnualType));
        when(leaveRequestRepository.findByEmployeeIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any(), any(), any())).thenReturn(List.of());

        LeaveLedger ledger = LeaveLedger.builder().availableBalance(20.0).build();
        when(leaveLedgerService.getOrCreate(any(), any(), anyInt())).thenReturn(ledger);

        EligibilityCheckRequest req = EligibilityCheckRequest.builder()
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(LocalDate.now().plusDays(10))
                .endDate(LocalDate.now().plusDays(12))
                .build();

        EligibilityResponse response = eligibilityService.check(terminated, req);

        assertFalse(response.isEligible());
        assertEquals("EMPLOYEE_NOT_ACTIVE", response.getBlockingCode());
    }

    @Test
    void testLeaveTypeInactiveBlocks() {
        LeaveType inactiveType = LeaveType.builder()
                .code(L_CODE.UNPAID)
                .isActive(false)
                .build();

        when(leaveTypeRepository.findByCode("UNPAID")).thenReturn(Optional.of(inactiveType));
        when(leaveRequestRepository.findByEmployeeIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any(), any(), any())).thenReturn(List.of());

        EligibilityCheckRequest req = EligibilityCheckRequest.builder()
                .leaveTypeCode(L_CODE.UNPAID)
                .startDate(LocalDate.now().plusDays(10))
                .endDate(LocalDate.now().plusDays(12))
                .build();

        EligibilityResponse response = eligibilityService.check(activeEmployee, req);

        assertFalse(response.isEligible());
        assertEquals("LEAVE_TYPE_INACTIVE", response.getBlockingCode());
    }

    @Test
    void testEndDateBeforeStartDateBlocks() {
        when(leaveTypeRepository.findByCode("PAID_ANNUAL")).thenReturn(Optional.of(paidAnnualType));
        when(leaveRequestRepository.findByEmployeeIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any(), any(), any())).thenReturn(List.of());

        LeaveLedger ledger = LeaveLedger.builder().availableBalance(20.0).build();
        when(leaveLedgerService.getOrCreate(any(), any(), anyInt())).thenReturn(ledger);

        EligibilityCheckRequest req = EligibilityCheckRequest.builder()
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(LocalDate.now().plusDays(10))
                .endDate(LocalDate.now().plusDays(5))
                .build();

        EligibilityResponse response = eligibilityService.check(activeEmployee, req);

        assertFalse(response.isEligible());
        assertEquals("INVALID_DATE_RANGE", response.getBlockingCode());
    }
}
