package com.stagepfa.demo.domain.entities.embedded;

import com.stagepfa.demo.domain.enums.BonusApplication;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveBonus {
    private String label;
    private BonusApplication appliesTo;
    private boolean isOverride;
    private double amount;

    private Integer minYearsOfService;
    private Integer maxAge;
    private Integer everyNYears;
}
