package com.stagepfa.demo.services.impl;

import com.stagepfa.demo.domain.dtos.response.SupportingDocumentResponse;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.SupportingDocument;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.exception.ResourceNotFoundException;
import com.stagepfa.demo.repositories.EmployeeRepository;
import com.stagepfa.demo.repositories.SupportingDocumentRepository;
import com.stagepfa.demo.services.CurrentUserService;
import com.stagepfa.demo.services.SupportingDocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupportingDocumentServiceImpl implements SupportingDocumentService {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final SupportingDocumentRepository supportingDocumentRepository;
    private final EmployeeRepository employeeRepository;
    private final CurrentUserService currentUserService;

    @Override
    @Transactional
    public SupportingDocumentResponse upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "File is empty or missing");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "File size exceeds the 10MB limit");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Unsupported file format. Only PDF, JPEG, PNG, and WebP are supported");
        }

        User user = currentUserService.requireLinkedUser();
        String employeeId = user.getEmployeeId();
        if (employeeId == null || employeeId.isBlank()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Account is not linked to an employee");
        }

        try {
            SupportingDocument doc = SupportingDocument.builder()
                    .employeeId(employeeId)
                    .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "document")
                    .contentType(contentType)
                    .fileSize(file.getSize())
                    .data(file.getBytes())
                    .uploadedAt(Instant.now())
                    .build();

            SupportingDocument saved = supportingDocumentRepository.save(doc);

            return SupportingDocumentResponse.builder()
                    .id(saved.getId())
                    .fileName(saved.getFileName())
                    .contentType(saved.getContentType())
                    .fileSize(saved.getFileSize())
                    .uploadedAt(saved.getUploadedAt())
                    .build();
        } catch (IOException e) {
            log.error("Failed to read uploaded file bytes", e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Failed to read file content");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public SupportingDocument get(String id) {
        SupportingDocument doc = supportingDocumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SupportingDocument", id));

        validateAccess(doc);

        return doc;
    }

    @Override
    @Transactional(readOnly = true)
    public SupportingDocumentResponse getMetadata(String id) {
        SupportingDocument doc = supportingDocumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SupportingDocument", id));

        validateAccess(doc);

        return SupportingDocumentResponse.builder()
                .id(doc.getId())
                .fileName(doc.getFileName())
                .contentType(doc.getContentType())
                .fileSize(doc.getFileSize())
                .uploadedAt(doc.getUploadedAt())
                .build();
    }

    private void validateAccess(SupportingDocument doc) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities().stream().anyMatch(a ->
                "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_HR".equals(a.getAuthority()))) {
            return;
        }

        User user = currentUserService.requireLinkedUser();
        String currentEmployeeId = user.getEmployeeId();
        if (currentEmployeeId == null || currentEmployeeId.isBlank()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Account is not linked to an employee");
        }

        if (currentEmployeeId.equals(doc.getEmployeeId())) {
            return;
        }

        // Check if current employee is the manager of the document owner
        Employee owner = employeeRepository.findById(doc.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee", doc.getEmployeeId()));

        if (owner.getCurrentManager() != null && currentEmployeeId.equals(owner.getCurrentManager().getEmployeeId())) {
            return;
        }

        throw new BusinessException(ErrorCode.FORBIDDEN, "You are not authorized to access this document");
    }
}
