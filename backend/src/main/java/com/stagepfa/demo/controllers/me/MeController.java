package com.stagepfa.demo.controllers.me;

import com.stagepfa.demo.domain.dtos.response.EmployeeResponse;
import com.stagepfa.demo.domain.dtos.response.UserResponse;
import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.mappers.EmployeeMapper;
import com.stagepfa.demo.mappers.UserMapper;
import com.stagepfa.demo.services.CurrentEmployeeResolver;
import com.stagepfa.demo.services.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

    private final CurrentUserService currentUserService;
    private final CurrentEmployeeResolver employeeResolver;
    private final UserMapper userMapper;
    private final EmployeeMapper employeeMapper;

    @GetMapping
    public ResponseEntity<UserResponse> me() {
        User user = currentUserService.requireCurrentUser(); // with dummy
        return ResponseEntity.ok(userMapper.toResponse(user));
    }

    @GetMapping("/profile")
    public ResponseEntity<EmployeeResponse> profile() {
        Employee employee = employeeResolver.requireActiveEmployee();
        return ResponseEntity.ok(
                employeeMapper.toResponse(employee)); // identical mapper as HR controller
    }
}
