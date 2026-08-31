package com.stagepfa.demo.domain.dtos.response;

import com.stagepfa.demo.domain.entities.embedded.UserRoleRef;
import com.stagepfa.demo.domain.enums.AccountStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private String id;
    private String email;
    private String employeeId;
    private AccountStatus accountStatus;
    private UserRoleRef role;
    private Instant lastLoginAt;
    private Instant createdAt;
    private Instant updatedAt;
}
