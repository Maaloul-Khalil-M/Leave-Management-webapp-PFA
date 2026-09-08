package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.CalendarDto;
import com.stagepfa.demo.domain.enums.CountryCode;

import java.util.List;

public interface CalendarService {

    CalendarDto create(CalendarDto dto);

    CalendarDto getById(String id);

    List<CalendarDto> getAll();

    CalendarDto update(String id, CalendarDto dto);

    CalendarDto findByCountryAndYear(CountryCode country, Integer year);

    void delete(String id);
}
