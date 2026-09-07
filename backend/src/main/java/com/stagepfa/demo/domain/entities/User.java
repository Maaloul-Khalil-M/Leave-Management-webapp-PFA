package com.stagepfa.demo.domain.entities;

import com.stagepfa.demo.domain.entities.embedded.Identity;
import com.stagepfa.demo.domain.enums.AccountStatus;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

import java.time.Instant;

@Document("users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndex(name = "identity_provider_subject_unique",
        def = "{'identity.provider': 1, 'identity.subject': 1}", unique = true)
public class User {

    //@Id
    @MongoId
    private String id;

    // Snapshot of the identity claim, not the identifier
    // based info can be used in jwt claims, e.g. email, name, etc.
    private String email;

    // FK/reference to Employee.id
    private String employeeId;

    private AccountStatus accountStatus;

    // Keycloak/OIDC sub
    private Identity identity;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}

