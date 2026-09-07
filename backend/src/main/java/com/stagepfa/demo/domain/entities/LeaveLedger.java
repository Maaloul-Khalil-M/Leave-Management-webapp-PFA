package com.stagepfa.demo.domain.entities;

import com.stagepfa.demo.domain.entities.embedded.LedgerMovement;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "leave_ledgers")
@CompoundIndex(name = "emp_type_year",
        def = "{'employeeId': 1, 'leaveTypeCode': 1, 'year': 1}", unique = true)
public class LeaveLedger {
    //@Id
    @MongoId
    private String id;

    private String employeeId; // Reference to Employee entity
    private String leaveTypeCode; // Reference to LeaveType entity
    private int year; // The year for which this ledger is applicable

    //TODO: call policy bonuses
    private String policyId; // Reference to LeavePolicy entity

    private double accruedToDate;
    private double carriedOver;
    // both is total

    private double consumedBalance;

    private double availableBalance;

    @Builder.Default
    private List<LedgerMovement> movements = new ArrayList<>();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
