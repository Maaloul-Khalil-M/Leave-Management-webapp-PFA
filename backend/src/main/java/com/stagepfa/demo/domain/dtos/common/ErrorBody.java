package com.stagepfa.demo.domain.dtos.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorBody {
    private String code;
    private String message;
    private List<ErrorDetail> details;
    private String requestId;
}
