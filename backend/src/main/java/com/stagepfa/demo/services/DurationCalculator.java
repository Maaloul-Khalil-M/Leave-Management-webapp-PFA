package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.enums.AccrualUnit;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class DurationCalculator {

    public double calculate(
            LocalDate start,
            LocalDate end,
            boolean halfDayStart,
            boolean halfDayEnd,
            AccrualUnit accrualUnit,
            List<Integer> weekendDays) {

        if (accrualUnit == AccrualUnit.CALENDAR_DAY) {
            long totalDays = ChronoUnit.DAYS.between(start, end) + 1;
            double days = (double) totalDays;
            if (halfDayStart) {
                days -= 0.5;
            }
            if (halfDayEnd) {
                days -= 0.5;
            }
            return Math.max(0.0, days);
        }

        // WORKING_DAY
        List<Integer> weekends = (weekendDays != null && !weekendDays.isEmpty()) ? weekendDays : List.of(6, 7);

        double workingDays = 0.0;
        LocalDate current = start;
        while (!current.isAfter(end)) {
            int dayOfWeek = current.getDayOfWeek().getValue();
            if (!weekends.contains(dayOfWeek)) {
                workingDays += 1.0;
            }
            current = current.plusDays(1);
        }

        if (workingDays > 0) {
            if (halfDayStart && !weekends.contains(start.getDayOfWeek().getValue())) {
                workingDays -= 0.5;
            }
            if (halfDayEnd && !weekends.contains(end.getDayOfWeek().getValue())) {
                workingDays -= 0.5;
            }
        }

        return Math.max(0.0, workingDays);
    }
}
