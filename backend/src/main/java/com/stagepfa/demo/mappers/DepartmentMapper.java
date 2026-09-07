package com.stagepfa.demo.mappers;


import com.stagepfa.demo.domain.dtos.request.CreateDepartmentRequest;
import com.stagepfa.demo.domain.dtos.response.DepartmentResponse;
import com.stagepfa.demo.domain.entities.Department;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface DepartmentMapper {
    DepartmentResponse toResponse(Department entity);

    Department toEntity(CreateDepartmentRequest request);
}
