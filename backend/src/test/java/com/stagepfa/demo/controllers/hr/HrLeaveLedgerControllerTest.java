package com.stagepfa.demo.controllers.hr;

import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.request.LeaveAdjustmentRequest;
import com.stagepfa.demo.domain.dtos.response.LeaveLedgerResponse;
import com.stagepfa.demo.domain.entities.LeaveLedger;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.enums.LedgerMovementType;
import com.stagepfa.demo.mappers.LeaveLedgerMapper;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.LeavePolicyRepository;
import com.stagepfa.demo.repositories.LeaveTypeRepository;
import com.stagepfa.demo.services.CurrentUserService;
import com.stagepfa.demo.services.LeaveLedgerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HrLeaveLedgerControllerTest {

    @Mock
    private LeaveLedgerService leaveLedgerService;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private LeaveTypeRepository leaveTypeRepository;

    @Mock
    private LeavePolicyRepository leavePolicyRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    private LeaveLedgerMapper leaveLedgerMapper;
    private HrLeaveLedgerController controller;

    @BeforeEach
    void setUp() {
        leaveLedgerMapper = Mappers.getMapper(LeaveLedgerMapper.class);
        controller = new HrLeaveLedgerController(
                leaveLedgerService,
                currentUserService,
                leaveLedgerMapper,
                leaveTypeRepository,
                leavePolicyRepository,
                employeeRepository
        );
    }

    @Test
    void adjust_successfullyCreatesAdjustment() {
        User adminUser = User.builder()
                .id("admin-user-id")
                .email("admin@acme.tn")
                .build();
        when(currentUserService.requireUser()).thenReturn(adminUser);

        LeaveAdjustmentRequest request = new LeaveAdjustmentRequest();
        request.setEmployeeId("emp-1");
        request.setLeaveTypeCode("PAID_ANNUAL");
        request.setYear(2026);
        request.setAmount(2.0);
        request.setType(LedgerMovementType.HR_ADJUSTMENT_CREDIT);
        request.setNote("Discretionary credit");

        LeaveLedger adjustedLedger = LeaveLedger.builder()
                .id("ledger-1")
                .employeeId("emp-1")
                .leaveTypeCode("PAID_ANNUAL")
                .year(2026)
                .availableBalance(22.0)
                .accruedToDate(20.0)
                .consumedBalance(0.0)
                .carriedOver(0.0)
                .movements(new ArrayList<>())
                .build();

        when(leaveLedgerService.adjust(eq(request), eq("admin-user-id"))).thenReturn(adjustedLedger);

        ResponseEntity<LeaveLedgerResponse> response = controller.adjust(request);

        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("ledger-1", response.getBody().getId());
        assertEquals(22.0, response.getBody().getAvailableBalance());
        verify(leaveLedgerService, times(1)).adjust(request, "admin-user-id");
    }

    @Test
    void list_withoutYear_callsFindByEmployeeId() {
        LeaveLedger ledger = LeaveLedger.builder()
                .id("ledger-1")
                .employeeId("emp-1")
                .leaveTypeCode("PAID_ANNUAL")
                .year(2026)
                .build();

        when(leaveLedgerService.findByEmployeeId("emp-1")).thenReturn(List.of(ledger));

        ResponseEntity<PageResponse<LeaveLedgerResponse>> response = controller.list("emp-1", null);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().getData().size());
        verify(leaveLedgerService).findByEmployeeId("emp-1");
        verify(leaveLedgerService, never()).findByEmployeeIdAndYear(any(), anyInt());
    }

    @Test
    void list_withYear_callsFindByEmployeeIdAndYear() {
        LeaveLedger ledger = LeaveLedger.builder()
                .id("ledger-1")
                .employeeId("emp-1")
                .leaveTypeCode("PAID_ANNUAL")
                .year(2026)
                .build();

        when(leaveLedgerService.findByEmployeeIdAndYear("emp-1", 2026)).thenReturn(List.of(ledger));

        ResponseEntity<PageResponse<LeaveLedgerResponse>> response = controller.list("emp-1", 2026);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().getData().size());
        verify(leaveLedgerService).findByEmployeeIdAndYear("emp-1", 2026);
    }

    @Test
    void getById_returnsLedger() {
        LeaveLedger ledger = LeaveLedger.builder()
                .id("ledger-1")
                .employeeId("emp-1")
                .leaveTypeCode("PAID_ANNUAL")
                .year(2026)
                .build();

        when(leaveLedgerService.findById("ledger-1")).thenReturn(ledger);

        ResponseEntity<LeaveLedgerResponse> response = controller.getById("ledger-1");

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("ledger-1", response.getBody().getId());
    }
}
