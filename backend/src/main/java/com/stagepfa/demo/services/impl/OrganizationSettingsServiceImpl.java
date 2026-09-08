package com.stagepfa.demo.services.impl;


import com.stagepfa.demo.domain.dtos.request.UpdateOrganizationSettingsRequest;
import com.stagepfa.demo.domain.entities.OrganizationSettings;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.mappers.OrganizationSettingsMapper;
import com.stagepfa.demo.repositories.OrganizationSettingsRepository;
import com.stagepfa.demo.services.OrganizationSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizationSettingsServiceImpl implements OrganizationSettingsService {

    private final OrganizationSettingsRepository repository;
    private final OrganizationSettingsMapper mapper;

    @Override
    public OrganizationSettings get() {
        return repository.findAll()
                         .stream()
                         .findFirst()
                         .orElseThrow(() -> new ResourceNotFoundException(
                                 "OrganizationSettings", "singleton"));
    }

    @Override
    @Transactional
    public OrganizationSettings update(UpdateOrganizationSettingsRequest request) {
        OrganizationSettings settings = get();

        mapper.updateEntity(request, settings);

        return repository.save(settings);
    }
}
