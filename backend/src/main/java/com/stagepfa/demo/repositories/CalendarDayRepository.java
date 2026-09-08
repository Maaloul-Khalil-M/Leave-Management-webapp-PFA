package com.stagepfa.demo.repositories;

import com.stagepfa.demo.domain.entities.CalendarDay;
import com.stagepfa.demo.domain.enums.DayType;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CalendarDayRepository extends MongoRepository<CalendarDay, String> {
    List<CalendarDay> findByCalendarIdOrderByDateAsc(String calendarId);

    List<CalendarDay> findByCalendarIdAndDayTypeOrderByDateAsc(String calendarId,
                                                               DayType dayType);

    void deleteByCalendarId(String calendarId);

    Optional<CalendarDay> findByCalendarIdAndDate(String calendarId, LocalDate date);
}
