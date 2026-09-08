package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.dtos.CalendarDto;
import com.stagepfa.demo.domain.entities.Calendar;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.mappers.CalendarMapper;
import com.stagepfa.demo.repositories.CalendarDayRepository;
import com.stagepfa.demo.repositories.CalendarRepository;
import com.stagepfa.demo.services.CalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CalendarServiceImpl implements CalendarService {

    private final CalendarRepository repository;
    private final CalendarMapper mapper;
    private final CalendarDayRepository calendarDayRepository;

    @Override
    public CalendarDto create(CalendarDto dto) {
        if (repository.existsByCode(dto.getCode())) {
            throw new IllegalArgumentException(
                    "Calendar code already exists: " + dto.getCode());
        }
        Calendar saved = repository.save(mapper.toEntity(dto));
        return mapper.toDto(saved);
    }

    @Override
    public CalendarDto getById(String id) {
        return mapper.toDto(get(id));
    }

    @Override
    public List<CalendarDto> getAll() {
        return repository.findAll()
                         .stream()
                         .map(mapper::toDto)
                         .toList();
    }

    @Override
    public CalendarDto update(String id, CalendarDto dto) {
        Calendar calendar = get(id);
        mapper.updateEntity(dto, calendar);
        return mapper.toDto(repository.save(calendar));
    }


    private Calendar get(String id) {
        return repository.findById(id)
                         .orElseThrow(
                                 () -> new ResourceNotFoundException("Calendar", id));
    }


    @Override
    public CalendarDto findByCountryAndYear(CountryCode country, Integer year) {
        Calendar calendar = repository.findByCountryAndYear(country, year)
                                      .orElseThrow(() -> new ResourceNotFoundException(
                                              "Calendar", country + "-" + year));
        return mapper.toDto(calendar);
    }

    @Override
    public void delete(String id) {
        Calendar calendar = get(id);
        calendarDayRepository.deleteByCalendarId(id); // cascade
        repository.delete(calendar);
    }
}
