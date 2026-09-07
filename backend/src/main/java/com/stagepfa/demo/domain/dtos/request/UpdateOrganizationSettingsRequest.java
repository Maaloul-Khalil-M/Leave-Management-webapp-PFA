package com.stagepfa.demo.domain.dtos.request;

import com.stagepfa.demo.domain.enums.CountryCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class UpdateOrganizationSettingsRequest {
    @NotBlank
    private String companyName;

    @NotNull
    private CountryCode country;
    
    @NotNull
    private List<Integer> weekendDays;
}
