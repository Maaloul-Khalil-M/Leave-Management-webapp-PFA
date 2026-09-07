package com.stagepfa.demo.mappers;


import com.stagepfa.demo.domain.dtos.request.UpdateOrganizationSettingsRequest;
import com.stagepfa.demo.domain.dtos.response.OrganizationSettingsResponse;
import com.stagepfa.demo.domain.entities.OrganizationSettings;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface OrganizationSettingsMapper {
    OrganizationSettingsResponse toResponse(OrganizationSettings entity);

    void updateEntity(UpdateOrganizationSettingsRequest request,
                      @MappingTarget OrganizationSettings entity);
}
