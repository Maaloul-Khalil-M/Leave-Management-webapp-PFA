package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.entities.Department;

import java.util.List;

public interface DepartmentService {
    List<Department> findAll();

    Department findById(String id);

    Department create(Department department);
}
