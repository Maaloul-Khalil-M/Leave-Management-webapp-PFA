package com.stagepfa.demo.repositories;


import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.domain.enums.LeaveRequestStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface LeaveRequestRepository extends MongoRepository<LeaveRequest, String> {
    List<LeaveRequest> findByEmployeeId(String employeeId);

    List<LeaveRequest> findByEmployeeIdAndStatus(String employeeId,
                                                 LeaveRequestStatus status);

    List<LeaveRequest> findByEmployeeIdInAndStatus(Collection<String> employeeIds,
                                                   LeaveRequestStatus status);

    /*
    WHERE employee_id = :employeeId
      AND status = :status
      AND start_date <= :date
      AND end_date >= :date
     */
    List<LeaveRequest> findByEmployeeIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            String employeeId, LeaveRequestStatus status, LocalDate end, LocalDate start);

    /*
    WHERE employee_id IN (:employeeIds)
      AND status = :status
      AND start_date <= :date
      AND end_date >= :date
     */
    List<LeaveRequest> findByEmployeeIdInAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Collection<String> employeeIds, LeaveRequestStatus status, LocalDate end,
            LocalDate start);
}
