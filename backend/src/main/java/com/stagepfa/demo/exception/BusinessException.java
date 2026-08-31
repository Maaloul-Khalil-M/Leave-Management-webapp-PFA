package com.stagepfa.demo.exception;

import com.stagepfa.demo.domain.dtos.common.ErrorDetail;
import lombok.Getter;

import java.util.Collections;
import java.util.List;

@Getter
public class BusinessException extends RuntimeException {
    private final ErrorCode errorCode;
    private final List<ErrorDetail> details;

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.details = Collections.emptyList();
    }

    public BusinessException(ErrorCode errorCode, String message,
                             List<ErrorDetail> details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details != null ? details : Collections.emptyList();
    }
}
