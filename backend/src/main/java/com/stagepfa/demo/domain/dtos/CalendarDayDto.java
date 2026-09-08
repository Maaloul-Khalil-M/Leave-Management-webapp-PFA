package com.stagepfa.demo.domain.dtos;

import com.stagepfa.demo.domain.enums.DayType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CalendarDayDto {
    private String id;
    private String calendarId;

    @NotNull
    private LocalDate date;

    @NotNull
    private DayType dayType;

    @NotBlank
    private String label;
}
