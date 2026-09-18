package com.stagepfa.demo.controllers.hr;

import com.stagepfa.demo.domain.dtos.response.HrAnalyticsResponse;
import com.stagepfa.demo.services.HrAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/hr/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('HR', 'ADMIN')")
public class HrAnalyticsController {

    private final HrAnalyticsService hrAnalyticsService;

    @GetMapping
    @Operation(operationId = "getHrAnalytics", summary = "Get company-wide or department workforce analytics for HR/Admin")
    public ResponseEntity<HrAnalyticsResponse> getAnalytics(
            @RequestParam(required = false) String departmentId) {
        return ResponseEntity.ok(hrAnalyticsService.getAnalytics(departmentId));
    }
}
