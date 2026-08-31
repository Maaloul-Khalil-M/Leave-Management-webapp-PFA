package com.stagepfa.demo.exception;


import com.stagepfa.demo.domain.dtos.common.ApiErrorResponse;
import com.stagepfa.demo.domain.dtos.common.ErrorBody;
import com.stagepfa.demo.domain.dtos.common.ErrorDetail;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiErrorResponse> handleBusiness(BusinessException ex,
                                                           HttpServletRequest request) {
        return build(ex.getErrorCode(), ex.getMessage(), ex.getDetails(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ErrorDetail> details = ex.getBindingResult().getFieldErrors().stream()
                                      .map(fe -> ErrorDetail.builder()
                                                            .field(fe.getField())
                                                            .code("INVALID_VALUE")
                                                            .message(
                                                                    fe.getDefaultMessage())
                                                            .build())
                                      .collect(Collectors.toList());
        return build(ErrorCode.VALIDATION_ERROR, "The request contains invalid fields.",
                     details, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraint(
            ConstraintViolationException ex, HttpServletRequest request) {
        List<ErrorDetail> details = ex.getConstraintViolations().stream()
                                      .map(cv -> ErrorDetail.builder()
                                                            .field(cv.getPropertyPath()
                                                                     .toString())
                                                            .code("INVALID_VALUE")
                                                            .message(cv.getMessage())
                                                            .build())
                                      .collect(Collectors.toList());
        return build(ErrorCode.VALIDATION_ERROR, "The request contains invalid fields.",
                     details, request);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiErrorResponse> handleBadRequest(Exception ex,
                                                             HttpServletRequest request) {
        return build(ErrorCode.VALIDATION_ERROR, "Malformed request: " + ex.getMessage(),
                     List.of(), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneric(Exception ex,
                                                          HttpServletRequest request) {
        log.error("Unhandled exception", ex);
        return build(ErrorCode.INTERNAL_ERROR, "An unexpected error occurred.", List.of(),
                     request);
    }

    private ResponseEntity<ApiErrorResponse> build(ErrorCode code, String message,
                                                   List<ErrorDetail> details,
                                                   HttpServletRequest request) {
        String requestId = request.getHeader("X-Request-Id");
        if (requestId == null || requestId.isBlank()) {
            requestId = "req_" + UUID.randomUUID().toString().replace("-", "")
                                     .substring(0, 12);
        }
        ApiErrorResponse body = ApiErrorResponse.builder().error(ErrorBody.builder()
                                                                          .code(code.name())
                                                                          .message(
                                                                                  message)
                                                                          .details(
                                                                                  details)
                                                                          .requestId(
                                                                                  requestId)
                                                                          .build())
                                                .build();
        return new ResponseEntity<>(body, code.getHttpStatus());
    }
}
