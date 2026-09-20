package com.stagepfa.demo.controllers.employee;
 
import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.dtos.response.LeaveTypeResponse;
import com.stagepfa.demo.mappers.LeaveTypeMapper;
import com.stagepfa.demo.services.LeaveTypeService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/employee/leave-types")
@RequiredArgsConstructor
public class EmployeeLeaveTypeController {

    private final LeaveTypeService leaveTypeService;
    private final LeaveTypeMapper leaveTypeMapper;

    @GetMapping
    @Operation(operationId = "listActiveLeaveTypes", summary = "List active leave types for employees")
    public ResponseEntity<PageResponse<LeaveTypeResponse>> list() {
        List<LeaveTypeResponse> data = leaveTypeService.findActive()
                .stream()
                .map(leaveTypeMapper::toResponse)
                .toList();

        return ResponseEntity.ok(PageResponse.<LeaveTypeResponse>builder()
                .data(data)
                .pagination(PaginationMeta.builder()
                        .nextCursor(null)
                        .hasMore(false)
                        .limit(data.size())
                        .build())
                .build());
    }
}
