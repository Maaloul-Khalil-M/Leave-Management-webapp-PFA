package com.stagepfa.demo.services;


import com.stagepfa.demo.domain.entities.LeavePolicy;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.domain.enums.L_CODE;

import java.util.Arrays;
import java.util.List;

public interface LeavePolicyService {
    List<LeavePolicy> findAll();

    LeavePolicy findById(String id);

    LeavePolicy create(LeavePolicy policy);

    LeavePolicy update(String id, LeavePolicy updates);


    LeavePolicy resolve(CountryCode country, L_CODE leaveTypeCode);

    List<LeavePolicy> findByCountry(CountryCode country);
}
