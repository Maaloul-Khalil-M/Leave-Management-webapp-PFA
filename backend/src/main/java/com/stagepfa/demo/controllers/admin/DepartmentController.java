package com.stagepfa.demo.controllers.admin;

import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.dtos.request.CreateDepartmentRequest;
import com.stagepfa.demo.domain.dtos.response.DepartmentResponse;
import com.stagepfa.demo.domain.entities.Department;
import com.stagepfa.demo.mappers.DepartmentMapper;
import com.stagepfa.demo.services.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;
    private final DepartmentMapper departmentMapper;

    @GetMapping
    public ResponseEntity<PageResponse<DepartmentResponse>> list() {
        List<DepartmentResponse> data = departmentService.findAll()
                                                         .stream()
                                                         .map(departmentMapper::toResponse)
                                                         .toList();
        return ResponseEntity.ok(PageResponse.<DepartmentResponse>builder()
                                             .data(data)
                                             .pagination(PaginationMeta.builder()
                                                                       .nextCursor(null)
                                                                       .hasMore(false)
                                                                       .limit(data.size())
                                                                       .build())
                                             .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DepartmentResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(
                departmentMapper.toResponse(departmentService.findById(id)));
    }

    @PostMapping
    public ResponseEntity<DepartmentResponse> create(
            @Valid @RequestBody CreateDepartmentRequest request) {
        Department entity = departmentMapper.toEntity(request);
        Department saved = departmentService.create(entity);
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(departmentMapper.toResponse(saved));
    }
}
