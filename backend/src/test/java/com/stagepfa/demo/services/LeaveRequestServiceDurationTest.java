package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.request.CreateLeaveRequest;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeavePolicy;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.entities.OrganizationSettings;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.entities.embedded.Assignment;
import com.stagepfa.demo.domain.enums.AccrualUnit;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveRequestRepository;
import com.stagepfa.demo.services.impl.LeaveRequestServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeaveRequestServiceDurationTest {

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

    @org.mockito.Spy
    private DurationCalculator durationCalculator = new DurationCalculator();

    @Mock
    private EligibilityService eligibilityService;

    @InjectMocks
    private LeaveRequestServiceImpl leaveRequestService;

    private Employee employee;
    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id("u1")
                .employeeId("emp1")
                .build();

        employee = Employee.builder()
                .id("emp1")
                .currentAssignment(Assignment.builder()
                        .countryCode(CountryCode.TN)
                        .build())
                .build();

        when(currentUserService.requireLinkedUser()).thenReturn(user);
        when(employeeRepository.findById("emp1")).thenReturn(Optional.of(employee));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void testPaidAnnualUsesWorkingDaysExcludingWeekends() {
        // Friday to Monday: Fri, Sat, Sun, Mon
        LocalDate fri = LocalDate.of(2026, 10, 2);
        LocalDate mon = LocalDate.of(2026, 10, 5);

        when(organizationSettingsService.get()).thenReturn(OrganizationSettings.builder()
                .weekendDays(List.of(6, 7))
                .build());

        when(leavePolicyService.resolve(CountryCode.TN, L_CODE.PAID_ANNUAL)).thenReturn(
                LeavePolicy.builder()
                        .accrualUnit(AccrualUnit.WORKING_DAY)
                        .build()
        );

        CreateLeaveRequest request = CreateLeaveRequest.builder()
                .leaveTypeCode(L_CODE.PAID_ANNUAL)
                .startDate(fri)
                .endDate(mon)
                .build();

        LeaveRequest result = leaveRequestService.createDraft(request);
        assertEquals(2.0, result.getDurationDays(), "Paid annual should skip weekend days (Fri + Mon = 2)");
    }

    @Test
    void testSickLeaveUsesCalendarDaysIncludingWeekends() {
        // Friday to Monday: Fri, Sat, Sun, Mon = 4 calendar days
        LocalDate fri = LocalDate.of(2026, 10, 2);
        LocalDate mon = LocalDate.of(2026, 10, 5);

        when(leavePolicyService.resolve(CountryCode.TN, L_CODE.SICK)).thenReturn(
                LeavePolicy.builder()
                        .accrualUnit(AccrualUnit.CALENDAR_DAY)
                        .build()
        );

        CreateLeaveRequest request = CreateLeaveRequest.builder()
                .leaveTypeCode(L_CODE.SICK)
                .startDate(fri)
                .endDate(mon)
                .build();

        LeaveRequest result = leaveRequestService.createDraft(request);
        assertEquals(4.0, result.getDurationDays(), "Sick leave should count all calendar days including weekends");
    }

    @Test
    void testSickLeaveWithHalfDay() {
        LocalDate fri = LocalDate.of(2026, 10, 2);
        LocalDate mon = LocalDate.of(2026, 10, 5);

        when(leavePolicyService.resolve(CountryCode.TN, L_CODE.SICK)).thenReturn(
                LeavePolicy.builder()
                        .accrualUnit(AccrualUnit.CALENDAR_DAY)
                        .build()
        );

        CreateLeaveRequest request = CreateLeaveRequest.builder()
                .leaveTypeCode(L_CODE.SICK)
                .startDate(fri)
                .endDate(mon)
                .halfDayStart(true)
                .build();

        LeaveRequest result = leaveRequestService.createDraft(request);
        assertEquals(3.5, result.getDurationDays(), "Sick leave 4 days - 0.5 half day = 3.5");
    }
}
