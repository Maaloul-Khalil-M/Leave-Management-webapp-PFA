package com.stagepfa.demo.mappers;


import com.stagepfa.demo.domain.dtos.response.LeaveRequestResponse;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LeaveRequestMapper {
    LeaveRequestResponse toResponse(LeaveRequest entity);
}
