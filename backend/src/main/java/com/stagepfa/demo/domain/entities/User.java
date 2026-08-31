package com.stagepfa.demo.domain.entities;

import com.stagepfa.demo.domain.entities.embedded.Identity;
import com.stagepfa.demo.domain.entities.embedded.RoleRef;
import com.stagepfa.demo.domain.enums.AccountStatus;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

import java.time.Instant;

@Document("users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    //@Id breaks with 24-character id
    @MongoId
    private String id;

    private String email;                 // unique, case-insensitive lookup
    private String employeeId;          // nullable — null means "pure admin"

    private AccountStatus accountStatus;  // PENDING_ACTIVATION / ACTIVE / SUSPENDED
    private Identity identity;            // null until first login links it

    private RoleRef role;

    private Instant lastLoginAt;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

}


