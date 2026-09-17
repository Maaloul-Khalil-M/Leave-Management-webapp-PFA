package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.LeaveLedger;
import com.stagepfa.demo.domain.entities.LeaveType;
import com.stagepfa.demo.domain.entities.embedded.LedgerMovement;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.domain.enums.LedgerMovementType;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeaveLedgerRepository;
import com.stagepfa.demo.repositories.LeaveTypeRepository;
import com.stagepfa.demo.services.impl.LeaveLedgerServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveLedgerServiceTest {

    @Mock
    private LeaveLedgerRepository ledgerRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @InjectMocks
    private LeaveLedgerServiceImpl leaveLedgerService;

    private LeaveLedger existingLedger;

    @BeforeEach
    void setUp() {
        existingLedger = LeaveLedger.builder()
                .id("ledger-1")
                .employeeId("emp-1")
                .leaveTypeCode("PAID_ANNUAL")
                .year(2026)
                .accruedToDate(25.0)
                .consumedBalance(5.0)
                .carriedOver(0.0)
                .availableBalance(20.0)
                .movements(new ArrayList<>())
                .build();
    }

    @Test
    void appendMovement_cancelledLeaveCredit_decreasesConsumedAndIncreasesAvailable() {
        when(ledgerRepository.findByEmployeeIdAndLeaveTypeCodeAndYear("emp-1", "PAID_ANNUAL", 2026))
                .thenReturn(Optional.of(existingLedger));
        when(ledgerRepository.save(any(LeaveLedger.class))).thenAnswer(inv -> inv.getArgument(0));

        LedgerMovement movement = LedgerMovement.builder()
                .date(Instant.now())
                .type(LedgerMovementType.CANCELLED_LEAVE_CREDIT)
                .amount(3.0)
                .note("Leave cancelled")
                .build();

        LeaveLedger updated = leaveLedgerService.appendMovement("emp-1", "PAID_ANNUAL", 2026, movement);

        assertNotNull(updated);
        assertEquals(2.0, updated.getConsumedBalance(), 0.001, "Consumed balance should decrease from 5.0 to 2.0");
        assertEquals(23.0, updated.getAvailableBalance(), 0.001, "Available balance should increase from 20.0 to 23.0");
        assertEquals(1, updated.getMovements().size());
        assertEquals(3.0, updated.getMovements().get(0).getAmount());
    }
}
