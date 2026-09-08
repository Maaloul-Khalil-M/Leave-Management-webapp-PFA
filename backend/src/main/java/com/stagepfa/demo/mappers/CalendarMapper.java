package com.stagepfa.demo.mappers;

import com.stagepfa.demo.domain.dtos.CalendarDto;
import com.stagepfa.demo.domain.entities.Calendar;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CalendarMapper {

    CalendarDto toDto(Calendar entity);

    Calendar toEntity(CalendarDto dto);

    void updateEntity(CalendarDto dto, @MappingTarget Calendar entity);
}
