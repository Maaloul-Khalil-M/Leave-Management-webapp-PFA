package com.stagepfa.demo.mappers;

import com.stagepfa.demo.domain.dtos.request.CreateEmployeeRequest;
import com.stagepfa.demo.domain.dtos.request.UpdateEmployeeRequest;
import com.stagepfa.demo.domain.dtos.response.EmployeeResponse;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.embedded.EmployeeProfile;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface EmployeeMapper {

    EmployeeResponse toResponse(Employee entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "profile", expression = "java(toProfile(request))")
    @Mapping(target = "assignmentHistory", ignore = true)
    // currentAssignment is built in the service from request.getInitialAssignment(),
    // since resolving department/position labels needs repository lookups
    // that don't belong in a pure DTO->entity mapper.
    @Mapping(target = "currentAssignment", ignore = true)
    // currentManager is built in the service from request.getManagerEmployeeId(),
    // since it requires an EmployeeRepository lookup.
    @Mapping(target = "currentManager", ignore = true)
    Employee toEntity(CreateEmployeeRequest request);

    default EmployeeProfile toProfile(CreateEmployeeRequest request) {
        if (request == null) {
            return null;
        }
        return EmployeeProfile.builder().firstName(request.getFirstName())
                              .lastName(request.getLastName()).gender(request.getGender())
                              .birthDate(request.getBirthDate()).email(request.getEmail())
                              .phone(request.getPhone()).hireDate(request.getHireDate())
                              .build();
    }

    @BeanMapping(
            nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateProfile(UpdateEmployeeRequest request,
                       @MappingTarget EmployeeProfile profile);
}
