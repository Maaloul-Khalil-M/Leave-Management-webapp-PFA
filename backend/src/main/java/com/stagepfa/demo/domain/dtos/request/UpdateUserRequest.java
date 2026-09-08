package com.stagepfa.demo.domain.dtos.request;

import com.stagepfa.demo.domain.enums.AccountStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    // null = leave unchanged
    private AccountStatus accountStatus;

    // null = leave unchanged; blank string = unlink employee (per UserServiceImpl logic);
    // non-blank = must reference an existing Employee.id
    private String employeeId;
}
