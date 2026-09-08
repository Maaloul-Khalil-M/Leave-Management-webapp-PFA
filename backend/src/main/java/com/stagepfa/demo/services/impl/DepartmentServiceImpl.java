package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.entities.Department;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.DepartmentRepository;
import com.stagepfa.demo.services.DepartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentRepository repository;

    @Override
    public List<Department> findAll() {
        return repository.findAll();
    }

    @Override
    public Department findById(String id) {
        return repository.findById(id)
                         .orElseThrow(
                                 () -> new ResourceNotFoundException("Department", id));
    }

    @Override
    @Transactional
    public Department create(Department department) {
        department.setCreatedAt(Instant.now());
        return repository.save(department);
    }
}
