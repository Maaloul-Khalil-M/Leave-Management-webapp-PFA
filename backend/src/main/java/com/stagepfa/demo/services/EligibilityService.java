package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.request.EligibilityCheckRequest;
import com.stagepfa.demo.domain.dtos.response.EligibilityResponse;
import com.stagepfa.demo.domain.entities.Employee;

public interface EligibilityService {

    EligibilityResponse check(Employee employee, EligibilityCheckRequest request);

    EligibilityResponse checkCurrentUser(EligibilityCheckRequest request);
}
