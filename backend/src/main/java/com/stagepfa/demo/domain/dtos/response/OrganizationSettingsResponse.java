package com.stagepfa.demo.domain.dtos.response;

import com.stagepfa.demo.domain.enums.CountryCode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationSettingsResponse {
    private String id;
    private String companyName;
    private CountryCode country;
    private List<Integer> weekendDays;
    private Instant updatedAt;
    private String updatedBy;
}
