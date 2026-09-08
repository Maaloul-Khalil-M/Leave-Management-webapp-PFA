package com.stagepfa.demo.controllers.hr;

import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.dtos.request.CreateEmployeeRequest;
import com.stagepfa.demo.domain.dtos.request.UpdateEmployeeRequest;
import com.stagepfa.demo.domain.dtos.response.EmployeeResponse;
import com.stagepfa.demo.mappers.EmployeeMapper;
import com.stagepfa.demo.services.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hr/employees")
@RequiredArgsConstructor
public class EmployeesController {

    private final EmployeeService employeeService;
    private final EmployeeMapper employeeMapper;

    // returns all employees
    @GetMapping
    public ResponseEntity<PageResponse<EmployeeResponse>> list() {
        List<EmployeeResponse> data = employeeService.findAll()
                                                     .stream()
                                                     .map(employeeMapper::toResponse)
                                                     .toList();

        return ResponseEntity.ok(PageResponse.<EmployeeResponse>builder()
                                             .data(data)
                                             .pagination(PaginationMeta.builder()
                                                                       .nextCursor(null)
                                                                       .hasMore(false)
                                                                       .limit(data.size())
                                                                       .build())
                                             .build());
    }

    // returns a specific employee by id
    @GetMapping("/{id}")
    public ResponseEntity<EmployeeResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(employeeMapper.toResponse(employeeService.findById(id)));
    }

    // creates a new employee
    @PostMapping
    public ResponseEntity<EmployeeResponse> create(
            @Valid @RequestBody CreateEmployeeRequest request) {
        var saved = employeeService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(employeeMapper.toResponse(saved));
    }

    // updates an existing employee
    @PatchMapping("/{id}")
    public ResponseEntity<EmployeeResponse> update(@PathVariable String id,
                                                   @Valid @RequestBody
                                                   UpdateEmployeeRequest request) {
        var updated = employeeService.update(id, request);
        return ResponseEntity.ok(employeeMapper.toResponse(updated));
    }
}
