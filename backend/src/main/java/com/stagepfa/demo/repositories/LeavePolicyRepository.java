package com.stagepfa.demo.repositories;

import com.stagepfa.demo.domain.entities.LeavePolicy;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.domain.enums.L_CODE;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface LeavePolicyRepository extends MongoRepository<LeavePolicy, String> {
    LeavePolicy findByCountryAndLeaveTypeCode(CountryCode country, L_CODE leaveTypeCode);

    List<LeavePolicy> findByCountry(CountryCode country);
}
