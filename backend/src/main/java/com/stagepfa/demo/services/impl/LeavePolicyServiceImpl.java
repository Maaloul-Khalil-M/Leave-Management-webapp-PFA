package com.stagepfa.demo.services.impl;


import com.stagepfa.demo.domain.entities.LeavePolicy;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.domain.enums.L_CODE;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.LeavePolicyRepository;
import com.stagepfa.demo.services.LeavePolicyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeavePolicyServiceImpl implements LeavePolicyService {

    private final LeavePolicyRepository repository;

    @Override
    public List<LeavePolicy> findAll() {
        return repository.findAll();
    }

    @Override
    public List<LeavePolicy> findByCountry(CountryCode country) {
        return repository.findByCountry(country);
    }

    @Override
    public LeavePolicy findById(String id) {
        return repository.findById(id)
                         .orElseThrow(
                                 () -> new ResourceNotFoundException("LeavePolicy", id));
    }

    @Override
    @Transactional
    public LeavePolicy create(LeavePolicy policy) {
        return repository.save(policy);
    }

    @Override
    @Transactional
    public LeavePolicy update(String id, LeavePolicy updates) {
        findById(id);
        updates.setId(id);
        return repository.save(updates);
    }

    @Override
    public LeavePolicy resolve(CountryCode country, L_CODE leaveTypeCode) {
        return repository.findByCountryAndLeaveTypeCode(country, leaveTypeCode);
    }


}
