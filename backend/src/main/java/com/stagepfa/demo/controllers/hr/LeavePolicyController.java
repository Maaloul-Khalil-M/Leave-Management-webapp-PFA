package com.stagepfa.demo.controllers.hr;

import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.dtos.request.CreateLeavePolicyRequest;
import com.stagepfa.demo.domain.dtos.response.LeavePolicyResponse;
import com.stagepfa.demo.domain.enums.CountryCode;
import com.stagepfa.demo.mappers.LeavePolicyMapper;
import com.stagepfa.demo.services.LeavePolicyService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hr/leave-policies")
@RequiredArgsConstructor
public class LeavePolicyController {

    private final LeavePolicyService leavePolicyService;
    private final LeavePolicyMapper leavePolicyMapper;

    // Get all policies, optionally filtered by country
    @GetMapping
    @Operation(operationId = "listLeavePolicies", summary = "List leave policies")
    public ResponseEntity<PageResponse<LeavePolicyResponse>> list(
            @RequestParam(required = false) CountryCode country) {

        List<LeavePolicyResponse> data;

        if (country != null) {
            data = leavePolicyService.findByCountry(country)
                                     .stream()
                                     .map(leavePolicyMapper::toResponse)
                                     .toList();
        } else {
            data = leavePolicyService.findAll()
                                     .stream()
                                     .map(leavePolicyMapper::toResponse)
                                     .toList();
        }

        return ResponseEntity.ok(PageResponse.<LeavePolicyResponse>builder()
                                             .data(data)
                                             .pagination(PaginationMeta.builder()
                                                                       .nextCursor(null)
                                                                       .hasMore(false)
                                                                       .limit(data.size())
                                                                       .build())
                                             .build());
    }

    // get a policy by id
    @GetMapping("/{id}")
    @Operation(operationId = "getLeavePolicyById", summary = "Get a leave policy by ID")
    public ResponseEntity<LeavePolicyResponse> get(@PathVariable String id) {
        return ResponseEntity.ok(
                leavePolicyMapper.toResponse(leavePolicyService.findById(id)));
    }

    // create a new policy
    @PostMapping
    @Operation(operationId = "createLeavePolicy", summary = "Create a leave policy")
    public ResponseEntity<LeavePolicyResponse> create(
            @Valid @RequestBody CreateLeavePolicyRequest request) {
        var saved = leavePolicyService.create(leavePolicyMapper.toEntity(request));
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(leavePolicyMapper.toResponse(saved));
    }

}
