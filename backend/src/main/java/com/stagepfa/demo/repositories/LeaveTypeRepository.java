package com.stagepfa.demo.repositories;


import com.stagepfa.demo.domain.entities.LeaveType;
import com.stagepfa.demo.domain.enums.L_CODE;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface LeaveTypeRepository extends MongoRepository<LeaveType, String> {
    Optional<LeaveType> findByCode(L_CODE code);

    boolean existsByCode(L_CODE code);

    List<LeaveType> findByIsActiveTrue();
}
