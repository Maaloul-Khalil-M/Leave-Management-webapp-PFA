package com.stagepfa.demo.controllers.employee;

import com.stagepfa.demo.domain.dtos.response.EmployeeResponse;
import com.stagepfa.demo.domain.dtos.response.UserResponse;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.mappers.EmployeeMapper;
import com.stagepfa.demo.mappers.UserMapper;
import com.stagepfa.demo.services.CurrentEmployeeResolver;
import com.stagepfa.demo.services.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/employee")
@RequiredArgsConstructor
public class EmployeeController {

    private final CurrentUserService currentUserService;
    private final CurrentEmployeeResolver employeeResolver;
    private final UserMapper userMapper;
    private final EmployeeMapper employeeMapper;

    @GetMapping
    @Operation(operationId = "getCurrentUser", summary = "Get current user")
    public ResponseEntity<UserResponse> me() {
        User user = currentUserService.requireLinkedUser();
        return ResponseEntity.ok(userMapper.toResponse(user));
    }

    @GetMapping("/profile")
    @Operation(operationId = "getCurrentEmployeeProfile",
            summary = "Get current employee profile")
    public ResponseEntity<EmployeeResponse> profile() {
        Employee employee = employeeResolver.requireActiveEmployee();
        return ResponseEntity.ok(employeeMapper.toResponse(employee));
    }
}
