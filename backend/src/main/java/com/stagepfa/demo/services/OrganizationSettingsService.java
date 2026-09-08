package com.stagepfa.demo.services;


import com.stagepfa.demo.domain.dtos.request.UpdateOrganizationSettingsRequest;
import com.stagepfa.demo.domain.entities.OrganizationSettings;

public interface OrganizationSettingsService {
    OrganizationSettings get();

    OrganizationSettings update(UpdateOrganizationSettingsRequest request);
}
