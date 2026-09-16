package com.stagepfa.demo.controllers.manager;

import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.dtos.request.ApproveLeaveRequest;
import com.stagepfa.demo.domain.dtos.request.RejectLeaveRequest;
import com.stagepfa.demo.domain.dtos.response.LeaveRequestResponse;
import com.stagepfa.demo.domain.entities.LeaveRequest;
import com.stagepfa.demo.mappers.LeaveRequestMapper;
import com.stagepfa.demo.services.LeaveRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/manager/leave-requests")
@RequiredArgsConstructor
public class ManagerLeaveRequestController {

    private final LeaveRequestService leaveRequestService;
    private final LeaveRequestMapper leaveRequestMapper;

    @GetMapping("/pending")
    @Operation(operationId = "listPendingTeamRequests", summary = "List pending leave requests for direct reports")
    public ResponseEntity<PageResponse<LeaveRequestResponse>> listPending() {
        List<LeaveRequestResponse> data = leaveRequestService.listPendingTeamRequests()
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

    @PostMapping("/{id}/approve")
    @Operation(operationId = "approveLeaveRequest", summary = "Approve a pending leave request")
    @ApiResponse(responseCode = "200", description = "Leave request approved successfully")
    public ResponseEntity<LeaveRequestResponse> approve(
            @PathVariable String id,
            @RequestBody(required = false) ApproveLeaveRequest request) {
        String comment = request != null ? request.getComment() : null;
        LeaveRequest approved = leaveRequestService.approve(id, comment);
        return ResponseEntity.ok(leaveRequestMapper.toResponse(approved));
    }

    @PostMapping("/{id}/reject")
    @Operation(operationId = "rejectLeaveRequest", summary = "Reject a pending leave request")
    @ApiResponse(responseCode = "200", description = "Leave request rejected successfully")
    public ResponseEntity<LeaveRequestResponse> reject(
            @PathVariable String id,
            @Valid @RequestBody RejectLeaveRequest request) {
        LeaveRequest rejected = leaveRequestService.reject(id, request.getComment());
        return ResponseEntity.ok(leaveRequestMapper.toResponse(rejected));
    }
}
