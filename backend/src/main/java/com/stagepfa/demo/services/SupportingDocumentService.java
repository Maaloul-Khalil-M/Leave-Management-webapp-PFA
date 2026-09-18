package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.dtos.response.SupportingDocumentResponse;
import com.stagepfa.demo.domain.entities.SupportingDocument;
import org.springframework.web.multipart.MultipartFile;

public interface SupportingDocumentService {
    SupportingDocumentResponse upload(MultipartFile file);
    SupportingDocument get(String id);
    SupportingDocumentResponse getMetadata(String id);
}
