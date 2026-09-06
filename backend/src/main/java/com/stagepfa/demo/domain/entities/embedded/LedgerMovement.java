package com.stagepfa.demo.domain.entities.embedded;

import com.stagepfa.demo.domain.enums.LedgerMovementType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedgerMovement {
    //when
    private Instant date;
    //what type (+/-)
    private LedgerMovementType type;
    //how much it changed by
    private double amount;
    //any additional notes
    private String note;

    private String leaveRequestId; // reference req
    private String actorUserId; // reference user who made the change
}
