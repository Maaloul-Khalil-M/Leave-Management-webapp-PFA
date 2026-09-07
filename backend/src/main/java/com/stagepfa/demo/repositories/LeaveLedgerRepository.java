package com.stagepfa.demo.repositories;

import com.stagepfa.demo.domain.entities.LeaveLedger;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface LeaveLedgerRepository extends MongoRepository<LeaveLedger, String> {
    List<LeaveLedger> findByEmployeeId(String employeeId);

    List<LeaveLedger> findByEmployeeIdAndYear(String employeeId, int year);

    Optional<LeaveLedger> findByEmployeeIdAndLeaveTypeCodeAndYear(String employeeId,
                                                                  String leaveTypeCode,
                                                                  int year);
}
