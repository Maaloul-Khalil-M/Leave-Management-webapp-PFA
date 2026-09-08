package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.CalendarDayDto;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.domain.enums.DayType;

import java.time.LocalDate;
import java.util.List;

public interface CalendarDayService {

    CalendarDayDto create(String calendarId, CalendarDayDto dto);

    List<CalendarDayDto> getByCalendarId(String calendarId);

    List<CalendarDayDto> getByCalendarId(String calendarId, DayType dayType);

    List<CalendarDayDto> getByCountryAndYear(CountryCode country, Integer year);

    CalendarDayDto getById(String calendarId, String dayId);

    CalendarDayDto update(String calendarId, String dayId, CalendarDayDto dto);

    void delete(String calendarId, String dayId);

    CalendarDayDto findByCountryAndDate(CountryCode country, LocalDate date);

    List<CalendarDayDto> createAll(String calendarId, List<CalendarDayDto> dtos);
}
