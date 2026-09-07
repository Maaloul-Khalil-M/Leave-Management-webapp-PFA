package com.stagepfa.demo.domain.dtos.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdatePositionRequest {
    @Size(max = 150)
    private String title;

    @Size(max = 500)
    private String description;
}
