package com.stagepfa.demo.controllers.employee;

import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.dtos.request.CreateLeaveRequest;
import com.stagepfa.demo.domain.dtos.response.LeaveRequestResponse;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.mappers.LeaveRequestMapper;
import com.stagepfa.demo.services.LeaveRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employee/leave-requests")
@RequiredArgsConstructor
public class EmployeeLeaveRequestController {

    private final LeaveRequestService leaveRequestService;
    private final LeaveRequestMapper leaveRequestMapper;

    @PostMapping
    @Operation(operationId = "createDraftLeaveRequest", summary = "Create a draft leave request")
    @ApiResponse(responseCode = "201", description = "Draft leave request created successfully")
    public ResponseEntity<LeaveRequestResponse> createDraft(
            @Valid @RequestBody CreateLeaveRequest request) {
        LeaveRequest created = leaveRequestService.createDraft(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(leaveRequestMapper.toResponse(created));
    }

    @PostMapping("/{id}/submit")
    @Operation(operationId = "submitLeaveRequest", summary = "Submit a draft leave request")
    @ApiResponse(responseCode = "200", description = "Leave request submitted successfully")
    public ResponseEntity<LeaveRequestResponse> submit(@PathVariable String id) {
        LeaveRequest submitted = leaveRequestService.submit(id);
        return ResponseEntity.ok(leaveRequestMapper.toResponse(submitted));
    }

    @PostMapping("/{id}/cancel")
    @Operation(operationId = "cancelLeaveRequest", summary = "Cancel a leave request")
    @ApiResponse(responseCode = "200", description = "Leave request cancelled successfully")
    public ResponseEntity<LeaveRequestResponse> cancel(
            @PathVariable String id,
            @RequestBody(required = false) com.stagepfa.demo.domain.dtos.request.CancelLeaveRequest request) {
        String reason = request != null ? request.getReason() : null;
        LeaveRequest cancelled = leaveRequestService.cancel(id, reason);
        return ResponseEntity.ok(leaveRequestMapper.toResponse(cancelled));
    }

    @GetMapping
    @Operation(operationId = "listMyLeaveRequests", summary = "List current employee leave requests")
    public ResponseEntity<PageResponse<LeaveRequestResponse>> listMine() {
        List<LeaveRequestResponse> data = leaveRequestService.listMine()
                                                             .stream()
                                                             .map(leaveRequestMapper::toResponse)
                                                             .toList();

        return ResponseEntity.ok(PageResponse.<LeaveRequestResponse>builder()
                                             .data(data)
                                             .pagination(PaginationMeta.builder()
                                                                       .nextCursor(null)
                                                                       .hasMore(false)
                                                                       .limit(data.size())
                                                                       .build())
                                             .build());
    }
}
