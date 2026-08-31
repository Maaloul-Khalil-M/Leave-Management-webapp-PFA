package com.stagepfa.demo.domain.entities.embedded;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleRef {
    private String id;
    private String code;   // denormalized snapshot, e.g. "EMPLOYEE"
}
