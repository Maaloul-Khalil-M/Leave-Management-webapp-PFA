package com.stagepfa.demo.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // 4xx Client Errors
    BAD_REQUEST(HttpStatus.BAD_REQUEST), VALIDATION_ERROR(HttpStatus.BAD_REQUEST),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED), FORBIDDEN(HttpStatus.FORBIDDEN),

    // Not Found
    NOT_FOUND(HttpStatus.NOT_FOUND), RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND),

    // Conflict
    CONFLICT(HttpStatus.CONFLICT), DUPLICATE_RESOURCE(HttpStatus.CONFLICT),
    INVALID_STATUS_TRANSITION(HttpStatus.CONFLICT),

    // Unprocessable Entity
    INSUFFICIENT_BALANCE(HttpStatus.UNPROCESSABLE_ENTITY),
    OVERLAP_DETECTED(HttpStatus.UNPROCESSABLE_ENTITY),
    UNPROCESSABLE_ENTITY(HttpStatus.UNPROCESSABLE_ENTITY),

    // Rate Limiting
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS),

    // Other common errors
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED),
    NOT_ACCEPTABLE(HttpStatus.NOT_ACCEPTABLE),
    REQUEST_TIMEOUT(HttpStatus.REQUEST_TIMEOUT),
    UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE),

    // 5xx Server Errors
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR),
    DATABASE_ERROR(HttpStatus.INTERNAL_SERVER_ERROR),
    SERVICE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE);

    private final HttpStatus httpStatus;

    ErrorCode(HttpStatus httpStatus) {
        this.httpStatus = httpStatus;
    }
}
