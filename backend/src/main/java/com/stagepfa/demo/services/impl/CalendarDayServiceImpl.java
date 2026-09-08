package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.dtos.CalendarDayDto;
import com.stagepfa.demo.domain.entities.Calendar;
import com.stagepfa.demo.domain.entities.CalendarDay;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.domain.enums.DayType;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.mappers.CalendarDayMapper;
import com.stagepfa.demo.repositories.CalendarDayRepository;
import com.stagepfa.demo.repositories.CalendarRepository;
import com.stagepfa.demo.services.CalendarDayService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CalendarDayServiceImpl implements CalendarDayService {

    private final CalendarRepository calendarRepository;
    private final CalendarDayRepository repository;
    private final CalendarDayMapper mapper;


    @Override
    public CalendarDayDto create(String calendarId, CalendarDayDto dto) {
        ensureCalendarExists(calendarId);

        CalendarDay day = mapper.toEntity(dto);
        day.setCalendarId(calendarId);

        return mapper.toDto(repository.save(day));
    }

    @Override
    public List<CalendarDayDto> getByCalendarId(String calendarId) {
        ensureCalendarExists(calendarId);

        return repository.findByCalendarIdOrderByDateAsc(calendarId)
                         .stream()
                         .map(mapper::toDto)
                         .toList();
    }

    @Override
    public CalendarDayDto getById(String calendarId, String dayId) {
        return mapper.toDto(get(calendarId, dayId));
    }

    @Override
    public CalendarDayDto update(String calendarId, String dayId, CalendarDayDto dto) {
        CalendarDay day = get(calendarId, dayId);
        mapper.updateEntity(dto, day);
        return mapper.toDto(repository.save(day));
    }

    @Override
    public void delete(String calendarId, String dayId) {
        repository.delete(get(calendarId, dayId));
    }

    private CalendarDay get(String calendarId, String dayId) {
        return repository.findById(dayId)
                         .filter(day -> calendarId.equals(day.getCalendarId()))
                         .orElseThrow(
                                 () -> new ResourceNotFoundException("Calendar ", dayId));
    }

    private void ensureCalendarExists(String calendarId) {
        if (!calendarRepository.existsById(calendarId)) {
            throw new ResourceNotFoundException("Calendar ", calendarId);
        }
    }

    @Override
    public List<CalendarDayDto> getByCalendarId(String calendarId, DayType dayType) {
        ensureCalendarExists(calendarId);
        List<CalendarDay> days = (dayType != null) ?
                repository.findByCalendarIdAndDayTypeOrderByDateAsc(calendarId, dayType) :
                repository.findByCalendarIdOrderByDateAsc(calendarId);
        return days.stream()
                   .map(mapper::toDto)
                   .toList();
    }

    @Override
    public List<CalendarDayDto> getByCountryAndYear(CountryCode country, Integer year) {
        Calendar calendar = calendarRepository.findByCountryAndYear(country, year)
                                              .orElseThrow(
                                                      () -> new ResourceNotFoundException(
                                                              "calendar", String.valueOf(
                                                              year) + country));
        return repository.findByCalendarIdOrderByDateAsc(calendar.getId())
                         .stream()
                         .map(mapper::toDto)
                         .toList();
    }

    @Override
    public CalendarDayDto findByCountryAndDate(CountryCode country, LocalDate date) {
        Calendar calendar = calendarRepository.findByCountryAndYear(country,
                                                                    date.getYear())
                                              .orElseThrow(
                                                      () -> new ResourceNotFoundException(
                                                              "calendar", String.valueOf(
                                                              date.getYear()) + country));

        CalendarDay day = repository.findByCalendarIdAndDate(calendar.getId(), date)
                                    .orElseThrow(() -> new ResourceNotFoundException(
                                            "calendar day", date.toString()));
        return mapper.toDto(day);
    }

    @Override
    public List<CalendarDayDto> createAll(String calendarId, List<CalendarDayDto> dtos) {
        ensureCalendarExists(calendarId);
        List<CalendarDay> days = dtos.stream()
                                     .map(mapper::toEntity)
                                     .peek(day -> day.setCalendarId(calendarId))
                                     .toList();
        return repository.saveAll(days)
                         .stream()
                         .map(mapper::toDto)
                         .toList();
    }


}
