package com.stagepfa.demo.mappers;


import com.stagepfa.demo.domain.dtos.request.CreateLeaveTypeRequest;
import com.stagepfa.demo.domain.dtos.request.UpdateLeaveTypeRequest;
import com.stagepfa.demo.domain.dtos.response.LeaveTypeResponse;
import com.stagepfa.demo.domain.entities.LeaveType;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LeaveTypeMapper {
    LeaveTypeResponse toResponse(LeaveType entity);

    LeaveType toEntity(CreateLeaveTypeRequest request);

    void updateEntity(UpdateLeaveTypeRequest request, @MappingTarget LeaveType entity);
}
