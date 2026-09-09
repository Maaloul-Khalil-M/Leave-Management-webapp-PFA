package com.stagepfa.demo.domain.entities;

import com.stagepfa.demo.domain.entities.embedded.LeaveBonus;
import com.stagepfa.demo.domain.enums.AccrualUnit;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.domain.enums.L_CODE;
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
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "leave_policies")
public class LeavePolicy {
    //@Id
    @MongoId
    private String id;

    private CountryCode country;
    private L_CODE leaveTypeCode;


    private AccrualUnit accrualUnit;
    private double accrualRate;
    private Double maxBalance;

    // more rules
    private Double minBlockDays;
    private Integer noticeDays;

    @Builder.Default
    private List<LeaveBonus> bonuses = new ArrayList<>();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
