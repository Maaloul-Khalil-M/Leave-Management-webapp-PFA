package com.stagepfa.demo.domain.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportingDocumentResponse {
    private String id;
    private String fileName;
    private String contentType;
    private long fileSize;
    private Instant uploadedAt;
}
