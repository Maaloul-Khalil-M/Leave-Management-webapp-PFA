package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.response.Explanation;
import com.stagepfa.demo.domain.enums.ExplanationSeverity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ExplanationFactoryTest {

    private ExplanationFactory factory;

    @BeforeEach
    void setUp() {
        factory = new ExplanationFactory();
    }

    @Test
    void testInsufficientBalance() {
        Explanation exp = factory.insufficientBalance(7.0, 10.0);
        assertEquals("INSUFFICIENT_BALANCE", exp.getCode());
        assertEquals(ExplanationSeverity.BLOCKING, exp.getSeverity());
        assertEquals("Not enough paid leave", exp.getTitle());
        assertTrue(exp.getBody().contains("asking for 10.0 days but only have 7.0"));
        assertEquals(10.0, exp.getParams().get("requested"));
        assertEquals(7.0, exp.getParams().get("available"));
    }

    @Test
    void testOverlapApproved() {
        Explanation exp = factory.overlapApproved(List.of("req-1", "req-2"));
        assertEquals("OVERLAP_DETECTED", exp.getCode());
        assertEquals(ExplanationSeverity.BLOCKING, exp.getSeverity());
        assertEquals("Overlaps approved leave", exp.getTitle());
        assertTrue(exp.getBody().contains("overlap leave that is already approved"));
        assertEquals(List.of("req-1", "req-2"), exp.getParams().get("overlappingRequestIds"));
    }

    @Test
    void testMinBlockDays() {
        Explanation exp = factory.minBlockDays(6.0, 3.0);
        assertEquals("MIN_BLOCK_DAYS", exp.getCode());
        assertEquals(ExplanationSeverity.BLOCKING, exp.getSeverity());
        assertEquals("Minimum block length", exp.getTitle());
        assertTrue(exp.getBody().contains("needs at least 6.0 continuous days"));
    }

    @Test
    void testShortNotice() {
        Explanation exp = factory.shortNotice(3, 1);
        assertEquals("SHORT_NOTICE", exp.getCode());
        assertEquals(ExplanationSeverity.WARNING, exp.getSeverity());
        assertEquals("Short notice", exp.getTitle());
        assertTrue(exp.getBody().contains("requested at least 3 days ahead"));
        assertEquals(3, exp.getParams().get("noticeDays"));
        assertEquals(1L, exp.getParams().get("daysUntilStart"));
    }

    @Test
    void testBalanceOk() {
        Explanation exp = factory.balanceOk(15.0, 5.0);
        assertEquals("BALANCE_OK", exp.getCode());
        assertEquals(ExplanationSeverity.INFO, exp.getSeverity());
        assertEquals("Balance impact", exp.getTitle());
        assertTrue(exp.getBody().contains("leave you with 10.0"));
    }

    @Test
    void testBalanceUnaffected() {
        Explanation exp = factory.balanceUnaffected("SICK");
        assertEquals("BALANCE_UNAFFECTED", exp.getCode());
        assertEquals(ExplanationSeverity.INFO, exp.getSeverity());
        assertEquals("Balance not affected", exp.getTitle());
    }

    @Test
    void testDurationInfo() {
        Explanation exp = factory.durationInfo(4.0, "WORKING_DAY");
        assertEquals("DURATION_COMPUTED", exp.getCode());
        assertEquals(ExplanationSeverity.INFO, exp.getSeverity());
        assertEquals("Duration", exp.getTitle());
        assertTrue(exp.getBody().contains("4.0 day(s) (working days)"));
    }

    @Test
    void testProofRequired() {
        Explanation exp = factory.proofRequired("SICK");
        assertEquals("PROOF_REQUIRED", exp.getCode());
        assertEquals(ExplanationSeverity.WARNING, exp.getSeverity());
        assertEquals("Documentation needed", exp.getTitle());
    }

    @Test
    void testEmployeeNotActive() {
        Explanation exp = factory.employeeNotActive("SUSPENDED");
        assertEquals("EMPLOYEE_NOT_ACTIVE", exp.getCode());
        assertEquals(ExplanationSeverity.BLOCKING, exp.getSeverity());
        assertTrue(exp.getBody().contains("SUSPENDED"));
    }

    @Test
    void testLeaveTypeInactive() {
        Explanation exp = factory.leaveTypeInactive("SICK");
        assertEquals("LEAVE_TYPE_INACTIVE", exp.getCode());
        assertEquals(ExplanationSeverity.BLOCKING, exp.getSeverity());
    }

    @Test
    void testInvalidDateRange() {
        Explanation exp = factory.invalidDateRange();
        assertEquals("INVALID_DATE_RANGE", exp.getCode());
        assertEquals(ExplanationSeverity.BLOCKING, exp.getSeverity());
    }
}
