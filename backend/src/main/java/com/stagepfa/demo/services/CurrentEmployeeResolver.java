package com.stagepfa.demo.services;

import com.stagepfa.demo.domain.entities.Employee;
import com.stagepfa.demo.domain.entities.User;
import com.stagepfa.demo.domain.enums.EmploymentStatus;
import com.stagepfa.demo.exception.BusinessException;
import com.stagepfa.demo.exception.ErrorCode;
import com.stagepfa.demo.repositories.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CurrentEmployeeResolver {
    private final CurrentUserService currentUserService;
    private final EmployeeRepository employeeRepository;

    public Employee requireActiveEmployee() {
        User user = currentUserService.requireLinkedUser();
        Employee employee = employeeRepository.findById(user.getEmployeeId()).orElseThrow(
                () -> new BusinessException(ErrorCode.NOT_FOUND,
                                            "Linked employee not found: " + user.getEmployeeId()));
        if (employee.getEmploymentStatus() != EmploymentStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                                        "Employee is not active: " + employee.getEmploymentStatus());
        }
        return employee;
    }
}
