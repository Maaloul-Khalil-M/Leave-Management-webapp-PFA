package com.stagepfa.demo.controllers.admin;

import com.stagepfa.demo.domain.dtos.request.UpdateOrganizationSettingsRequest;
import com.stagepfa.demo.domain.dtos.response.OrganizationSettingsResponse;
import com.stagepfa.demo.mappers.OrganizationSettingsMapper;
import com.stagepfa.demo.services.OrganizationSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/organization-settings")
@RequiredArgsConstructor
public class OrganizationSettingsController {


    private final OrganizationSettingsService organizationSettingsService;
    private final OrganizationSettingsMapper organizationSettingsMapper;

    @GetMapping
    @Operation(operationId = "getOrganizationSettings",
            summary = "Get organization settings")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<OrganizationSettingsResponse> get() {
        return ResponseEntity.ok(
                organizationSettingsMapper.toResponse(organizationSettingsService.get()));
    }

    @PutMapping
    @Operation(operationId = "updateOrganizationSettings",
            summary = "Update organization settings")
    public ResponseEntity<OrganizationSettingsResponse> update(
            @Valid @RequestBody UpdateOrganizationSettingsRequest request) {
        var updated = organizationSettingsService.update(request);

        return ResponseEntity.ok(organizationSettingsMapper.toResponse(updated));
    }
}
