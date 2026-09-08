package com.stagepfa.demo.repositories;

import com.stagepfa.demo.domain.entities.OrganizationSettings;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface OrganizationSettingsRepository
        extends MongoRepository<OrganizationSettings, String> {
}
