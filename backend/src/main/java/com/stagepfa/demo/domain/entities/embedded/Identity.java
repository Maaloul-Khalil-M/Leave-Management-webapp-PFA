package com.stagepfa.demo.domain.entities.embedded;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Identity {
    private String provider;   // "KEYCLOAK"
    private String subject;    // the JWT "sub"
    private Instant linkedAt;
}
