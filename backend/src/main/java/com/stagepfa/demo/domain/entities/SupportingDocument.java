package com.stagepfa.demo.domain.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "supporting_documents")
public class SupportingDocument {

    @MongoId
    private String id;

    private String employeeId;
    private String fileName;
    private String contentType;
    private long fileSize;

    private byte[] data;

    @CreatedDate
    private Instant uploadedAt;
}
