package com.stagepfa.demo.controllers.admin;


import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.dtos.request.CreatePositionRequest;
import com.stagepfa.demo.domain.dtos.request.UpdatePositionRequest;
import com.stagepfa.demo.domain.dtos.response.PositionResponse;
import com.stagepfa.demo.domain.entities.Position;
import com.stagepfa.demo.mappers.PositionMapper;
import com.stagepfa.demo.services.PositionService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/positions")
@RequiredArgsConstructor
public class PositionController {

    private final PositionService positionService;
    private final PositionMapper positionMapper;

    @GetMapping
    @Operation(operationId = "listPositions", summary = "List positions")
    public ResponseEntity<PageResponse<PositionResponse>> list() {
        List<PositionResponse> data = positionService.findAll()
                                                     .stream()
                                                     .map(positionMapper::toResponse)
                                                     .toList();
        return ResponseEntity.ok(PageResponse.<PositionResponse>builder()
                                             .data(data)
                                             .pagination(PaginationMeta.builder()
                                                                       .nextCursor(null)
                                                                       .hasMore(false)
                                                                       .limit(data.size())
                                                                       .build())
                                             .build());
    }

    @GetMapping("/{id}")
    @Operation(operationId = "getPositionById", summary = "Get a position by ID")
    public ResponseEntity<PositionResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(positionMapper.toResponse(positionService.findById(id)));
    }

    @PostMapping
    @Operation(operationId = "createPosition", summary = "Create a position")
    public ResponseEntity<PositionResponse> create(
            @Valid @RequestBody CreatePositionRequest request) {
        Position entity = positionMapper.toEntity(request);
        Position saved = positionService.create(entity);
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(positionMapper.toResponse(saved));
    }

    @PatchMapping("/{id}")
    @Operation(operationId = "updatePosition", summary = "Update a position")
    public ResponseEntity<PositionResponse> update(@PathVariable String id,
                                                   @Valid @RequestBody
                                                   UpdatePositionRequest request) {
        Position existing = positionService.findById(id);
        positionMapper.updateEntity(request, existing);
        Position updated = positionService.update(id, existing);
        return ResponseEntity.ok(positionMapper.toResponse(updated));
    }
}
