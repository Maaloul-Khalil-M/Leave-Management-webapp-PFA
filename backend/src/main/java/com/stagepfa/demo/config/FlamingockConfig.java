package com.stagepfa.demo.config;

import com.mongodb.client.MongoClient;
import io.flamingock.targetsystem.mongodb.sync.MongoDBSyncTargetSystem;
import io.flamingock.store.mongodb.sync.MongoDBSyncAuditStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlamingockConfig {

    @Value("${app.mongodb.database:leave_management}")
    private String databaseName;

    @Bean
    public MongoDBSyncTargetSystem mongoTargetSystem(MongoClient mongoClient) {
        return new MongoDBSyncTargetSystem(
                "leave-management-mongo",
                mongoClient,
                databaseName
        );
    }

    @Bean
    public MongoDBSyncAuditStore auditStore(
            MongoDBSyncTargetSystem mongoTargetSystem) {

        return MongoDBSyncAuditStore.from(mongoTargetSystem);
    }
}
