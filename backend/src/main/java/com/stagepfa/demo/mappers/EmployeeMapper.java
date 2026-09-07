package com.stagepfa.demo.mappers;

import com.stagepfa.demo.domain.dtos.request.CreateEmployeeRequest;
import com.stagepfa.demo.domain.dtos.request.UpdateEmployeeRequest;
import com.stagepfa.demo.domain.dtos.response.EmployeeResponse;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.embedded.EmployeeProfile;
import org.mapstruct.*;

/**
 * Maps between Employee (Mongo document) and its DTOs.
 * <p>
 * Design rule: this mapper only does dumb, dependency-free field copying.
 * Anything that requires a repository lookup (resolving an ID to a
 * human-readable label, or fetching a related employee) is explicitly
 * ignored here and handled in the service layer instead, which has
 * repositories injected and the mapper does not.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface EmployeeMapper {

    /**
     * Flattens the entity (including nested profile/assignment fields)
     * into the response DTO. Pure name-based mapping — no overrides needed
     * because EmployeeResponse's field names mirror the nested structure.
     */
    EmployeeResponse toResponse(Employee entity);

    /**
     * Builds a new Employee from a creation request.
     * <p>
     * Fields intentionally left unset here (all default to null and are
     * populated afterward by the service):
     * <p>
     * - id: not assigned yet; Mongo generates it on save.
     * <p>
     * - profile: built via the toProfile() default method below instead
     * of relying on MapStruct's automatic nested mapping, so the
     * request -> EmployeeProfile field mapping is explicit and
     * reusable (toProfile is also handy to call/test on its own).
     * <p>
     * - assignmentHistory: a new employee has no past assignments yet;
     * it just starts as the empty list already defaulted on the entity.
     * <p>
     * - currentAssignment: the request only supplies IDs
     * (request.getInitialAssignment() -> departmentId, positionId),
     * but Assignment also needs human-readable labels
     * (departmentLabel, positionLabel). Resolving those requires
     * querying department/position repositories, which this mapper
     * has no access to. The service builds this field itself after
     * calling toEntity().
     * <p>
     * - currentManager: the request only supplies a manager's employee
     * ID (request.getManagerEmployeeId()), but ManagerRef needs more
     * than that ID. Resolving it requires an EmployeeRepository
     * lookup, so again the service builds and sets this afterward.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "profile", expression = "java(toProfile(request))")
    @Mapping(target = "assignmentHistory", ignore = true)
    @Mapping(target = "currentAssignment", ignore = true)
    @Mapping(target = "currentManager", ignore = true)
    Employee toEntity(CreateEmployeeRequest request);

    /**
     * Hand-written (not generated): flattens the creation request's
     * personal-info fields into an EmployeeProfile. Kept as an explicit
     * method — rather than letting MapStruct infer it — so it's easy to
     * read, reuse, and unit test independently of toEntity().
     */
    default EmployeeProfile toProfile(CreateEmployeeRequest request) {
        if (request == null) {
            return null;
        }
        return EmployeeProfile.builder()
                              .firstName(request.getFirstName())
                              .lastName(request.getLastName())
                              .gender(request.getGender())
                              .birthDate(request.getBirthDate())
                              .email(request.getEmail())
                              .phone(request.getPhone())
                              .hireDate(request.getHireDate())
                              .build();
    }

    /**
     * Partial update: mutates the existing profile in place rather than
     * building a new one, so fields the client didn't send are preserved.
     * <p>
     * nullValuePropertyMappingStrategy = IGNORE means: if a field on
     * UpdateEmployeeRequest is null, don't overwrite the existing value
     * on profile with null. This is what makes it a PATCH-style update
     * instead of a full replace — the client only needs to send the
     * fields they actually want to change.
     */
    @BeanMapping(
            nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateProfile(UpdateEmployeeRequest request,
                       @MappingTarget EmployeeProfile profile);
}
