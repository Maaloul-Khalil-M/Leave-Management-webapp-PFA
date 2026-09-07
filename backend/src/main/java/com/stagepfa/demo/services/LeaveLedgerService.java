package com.stagepfa.demo.services;


import com.stagepfa.demo.domain.dtos.request.LeaveAdjustmentRequest;
import com.stagepfa.demo.domain.entities.LeaveLedger;
import com.stagepfa.demo.domain.entities.embedded.LedgerMovement;

import java.util.List;

public interface LeaveLedgerService {
    List<LeaveLedger> findByEmployeeId(String employeeId);

    LeaveLedger findById(String id);

    LeaveLedger getOrCreate(String employeeId, String leaveTypeCode, int year);

    LeaveLedger appendMovement(String employeeId, String leaveTypeCode, int year,
                               LedgerMovement movement);

    LeaveLedger adjust(LeaveAdjustmentRequest request, String actorUserId);
}
