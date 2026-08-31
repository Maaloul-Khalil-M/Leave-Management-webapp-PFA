package com.stagepfa.demo.repositories;

import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.enums.EmploymentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends MongoRepository<Employee, String> {
    Optional<Employee> findByEmployeeNumber(String employeeNumber);

    boolean existsByEmployeeNumber(String employeeNumber);

    boolean existsByProfileEmailIgnoreCase(String email);

    List<Employee> findByCurrentManagerEmployeeId(String managerEmployeeId);

    List<Employee> findByEmploymentStatus(EmploymentStatus status);
}
