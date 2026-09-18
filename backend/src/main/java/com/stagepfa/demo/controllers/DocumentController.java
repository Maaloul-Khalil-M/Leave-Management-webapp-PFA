package com.stagepfa.demo.controllers;

import com.stagepfa.demo.domain.dtos.response.SupportingDocumentResponse;
import com.stagepfa.demo.domain.entities.SupportingDocument;
import com.stagepfa.demo.services.SupportingDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class DocumentController {

    private final SupportingDocumentService supportingDocumentService;

    @PostMapping(value = "/api/employee/leave-requests/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(operationId = "uploadSupportingDocument", summary = "Upload a supporting document for leave requests")
    @ApiResponse(responseCode = "201", description = "Document uploaded successfully")
    public ResponseEntity<SupportingDocumentResponse> uploadDocument(
            @RequestParam("file") MultipartFile file) {
        SupportingDocumentResponse response = supportingDocumentService.upload(file);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/api/documents/{id}")
    @Operation(operationId = "viewDocument", summary = "View or download a supporting document")
    public ResponseEntity<byte[]> viewDocument(@PathVariable String id) {
        SupportingDocument doc = supportingDocumentService.get(id);

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(doc.getContentType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getFileName() + "\"")
                .body(doc.getData());
    }

    @GetMapping("/api/documents/{id}/metadata")
    @Operation(operationId = "getDocumentMetadata", summary = "Get document metadata")
    public ResponseEntity<SupportingDocumentResponse> getMetadata(@PathVariable String id) {
        SupportingDocumentResponse response = supportingDocumentService.getMetadata(id);
        return ResponseEntity.ok(response);
    }
}
