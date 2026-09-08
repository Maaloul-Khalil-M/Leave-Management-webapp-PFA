package com.stagepfa.demo.domain.dtos;

import com.stagepfa.demo.domain.enums.CountryCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CalendarDto {
    private String id;

    @NotBlank
    private String code;

    @NotBlank
    private String name;

    @NotNull
    private CountryCode country;

    @NotNull
    private Integer year;
}
