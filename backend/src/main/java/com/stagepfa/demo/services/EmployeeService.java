package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.request.CreateEmployeeRequest;
import com.stagepfa.demo.domain.dtos.request.UpdateEmployeeRequest;
import com.stagepfa.demo.domain.entities.Employee;

import java.util.List;

public interface EmployeeService {
    List<Employee> findAll();

    Employee findById(String id);

    Employee create(CreateEmployeeRequest request);

    Employee update(String id, UpdateEmployeeRequest request);

    List<Employee> findByManager(String managerEmployeeId);

}
