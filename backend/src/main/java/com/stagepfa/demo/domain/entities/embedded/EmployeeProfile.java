package com.stagepfa.demo.domain.entities.embedded;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeProfile {
    private String firstName;
    private String lastName;
    private String gender;
    private LocalDate birthDate;
    @Indexed(unique = true)
    private String email;
    @Indexed(unique = true)
    private String phone;
    private LocalDate hireDate;
    private LocalDate departureDate;
}

