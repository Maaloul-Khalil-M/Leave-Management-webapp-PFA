package com.stagepfa.demo.mappers;

import com.stagepfa.demo.domain.dtos.response.LeaveLedgerResponse;
import com.stagepfa.demo.domain.entities.LeaveLedger;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class LeaveLedgerMapperTest {

    private final LeaveLedgerMapper mapper = Mappers.getMapper(LeaveLedgerMapper.class);

    @Test
    void toResponse_correctlyMapsCarriedOverToCarriedOverFromPreviousYear() {
        LeaveLedger ledger = LeaveLedger.builder()
                .id("ledger-101")
                .employeeId("emp-salma")
                .leaveTypeCode("PAID_ANNUAL")
                .year(2026)
                .policyId("policy-tn-1")
                .accruedToDate(10.0)
                .consumedBalance(0.0)
                .carriedOver(5.0)
                .availableBalance(15.0)
                .build();

        LeaveLedgerResponse response = mapper.toResponse(ledger);

        assertNotNull(response);
        assertEquals(5.0, response.getCarriedOverFromPreviousYear(), 0.001);
        assertEquals(10.0, response.getAccruedToDate(), 0.001);
        assertEquals(15.0, response.getAvailableBalance(), 0.001);
    }
}
