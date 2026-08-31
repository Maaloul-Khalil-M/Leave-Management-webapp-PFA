package com.stagepfa.demo.domain.entities.embedded;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Assignment {
    private String departmentId;
    private String departmentLabel;
    private String positionId;
    private String positionLabel;
    private LocalDate startDate;
    private LocalDate endDate;
}
