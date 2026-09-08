package com.stagepfa.demo.controllers.admin;

import com.stagepfa.demo.domain.dtos.common.PageResponse;
import com.stagepfa.demo.domain.dtos.common.PaginationMeta;
import com.stagepfa.demo.domain.dtos.request.CreateUserRequest;
import com.stagepfa.demo.domain.dtos.request.UpdateUserRequest;
import com.stagepfa.demo.domain.dtos.response.UserResponse;
import com.stagepfa.demo.mappers.UserMapper;
import com.stagepfa.demo.services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserMapper userMapper;

    @GetMapping
    public ResponseEntity<PageResponse<UserResponse>> list() {
        List<UserResponse> data = userService.findAll()
                                             .stream()
                                             .map(userMapper::toResponse)
                                             .toList();
        return ResponseEntity.ok(PageResponse.<UserResponse>builder()
                                             .data(data)
                                             .pagination(PaginationMeta.builder()
                                                                       .nextCursor(null)
                                                                       .hasMore(false)
                                                                       .limit(data.size())
                                                                       .build())
                                             .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(userMapper.toResponse(userService.findById(id)));
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(
            @Valid @RequestBody CreateUserRequest request) {
        var saved = userService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(userMapper.toResponse(saved));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<UserResponse> update(@PathVariable String id,
                                               @Valid @RequestBody
                                               UpdateUserRequest request) {
        var updated = userService.update(id, request);
        return ResponseEntity.ok(userMapper.toResponse(updated));
    }
}
