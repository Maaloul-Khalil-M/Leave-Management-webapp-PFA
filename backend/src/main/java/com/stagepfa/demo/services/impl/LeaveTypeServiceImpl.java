package com.stagepfa.demo.services.impl;


import com.stagepfa.demo.domain.entities.LeaveType;
import com.stagepfa.demo.exception.DuplicateResourceException;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.LeaveTypeRepository;
import com.stagepfa.demo.services.LeaveTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeaveTypeServiceImpl implements LeaveTypeService {

    private final LeaveTypeRepository repository;

    @Override
    public List<LeaveType> findAll() {
        return repository.findAll();
    }

    @Override
    public List<LeaveType> findActive() {
        return repository.findByIsActiveTrue();
    }

    @Override
    public LeaveType findById(String id) {
        return repository.findById(id)
                         .orElseThrow(
                                 () -> new ResourceNotFoundException("LeaveType", id));
    }

    @Override
    public LeaveType findByCode(String code) {
        return repository.findByCode(code)
                         .orElseThrow(
                                 () -> new ResourceNotFoundException("LeaveType", code));
    }

    @Override
    @Transactional
    public LeaveType create(LeaveType leaveType) {
        if (repository.existsByCode(leaveType.getCode())) {
            throw new DuplicateResourceException(
                    "Leave type code already exists: " + leaveType.getCode());
        }
        return repository.save(leaveType);
    }

    @Override
    @Transactional
    public LeaveType update(String id, LeaveType updates) {
        // Ensure the document exists; controller may have already applied a MapStruct patch.
        findById(id);
        return repository.save(updates);
    }
}

