package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.entities.LeaveType;

import java.util.List;

public interface LeaveTypeService {
    List<LeaveType> findAll();

    List<LeaveType> findActive();

    LeaveType findById(String id);

    LeaveType findByCode(String code);

    LeaveType create(LeaveType leaveType);

    LeaveType update(String id, LeaveType updates);
}
