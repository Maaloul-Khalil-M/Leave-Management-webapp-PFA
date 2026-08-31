package com.stagepfa.demo.repositories;

import com.stagepfa.demo.domain.entities.Department;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface DepartmentRepository extends MongoRepository<Department, String> {
}
