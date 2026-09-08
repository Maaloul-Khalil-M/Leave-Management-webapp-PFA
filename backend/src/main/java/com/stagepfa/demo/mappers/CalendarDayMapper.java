package com.stagepfa.demo.mappers;

import com.stagepfa.demo.domain.dtos.CalendarDayDto;
import com.stagepfa.demo.domain.entities.CalendarDay;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CalendarDayMapper {

    CalendarDayDto toDto(CalendarDay entity);

    CalendarDay toEntity(CalendarDayDto dto);

    void updateEntity(CalendarDayDto dto, @MappingTarget CalendarDay entity);
}
