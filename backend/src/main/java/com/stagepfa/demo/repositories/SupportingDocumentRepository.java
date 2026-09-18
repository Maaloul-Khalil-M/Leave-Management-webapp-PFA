package com.stagepfa.demo.repositories;

import com.stagepfa.demo.domain.entities.SupportingDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportingDocumentRepository extends MongoRepository<SupportingDocument, String> {
    List<SupportingDocument> findByEmployeeId(String employeeId);
}
