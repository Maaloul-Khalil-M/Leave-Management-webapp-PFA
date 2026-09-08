package com.stagepfa.demo.mappers;


import com.stagepfa.demo.domain.dtos.request.CreateLeavePolicyRequest;
import com.stagepfa.demo.domain.dtos.request.UpdateLeavePolicyRequest;
import com.stagepfa.demo.domain.dtos.response.LeavePolicyResponse;
import com.stagepfa.demo.domain.entities.LeavePolicy;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LeavePolicyMapper {

    LeavePolicyResponse toResponse(LeavePolicy entity);

    LeavePolicy toEntity(CreateLeavePolicyRequest request);

    void updateEntity(UpdateLeavePolicyRequest request,
                      @MappingTarget LeavePolicy entity);
}
