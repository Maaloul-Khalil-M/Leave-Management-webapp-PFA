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
public class PositionResponse {
    private String id;
    private String code;
    private String title;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
}
